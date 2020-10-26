import React, { ChangeEvent, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import "setimmediate";
import { State, SourceState } from "./types";
import { videoFormat, downloadFromInfo } from "ytdl-core";

export function Formats({ state }: { state: State }) {
  const [ready, setReady] = useState(false);
  const [video, setVideo] = useState<SourceState>();
  const [audio, setAudio] = useState<SourceState>();

  const { register } = useForm();

  function updateSourceBuffer(
    buffer: SourceBuffer,
    reader: NodeJS.ReadableStream
  ) {
    function updateendListener() {
      reader.resume();
    }
    buffer.addEventListener("updateend", updateendListener);
    buffer.addEventListener("error", console.error);
    reader.addListener("data", (data) => {
      reader.pause();
      buffer.appendBuffer(data);
    });

    function cleanup(): Promise<void> {
      return new Promise((resolve) => {
        buffer.removeEventListener("updateend", updateendListener);
        buffer.removeEventListener("error", console.error);
        reader.removeAllListeners();
        reader.pause();

        if (buffer.updating) {
          function abortListener() {
            buffer.removeEventListener("updateend", abortListener);
            resolve();
          }

          buffer.addEventListener("updateend", abortListener);
          buffer.abort();
        } else {
          resolve();
        }
      });
    }

    return { buffer, reader, cleanup };
  }

  function addSourceBuffer(format: videoFormat): SourceState {
    const buffer = state.mediaSource.addSourceBuffer(format.mimeType!);
    const reader = downloadFromInfo(state.info, { format });
    return updateSourceBuffer(buffer, reader);
  }

  async function switchFormat(format: videoFormat, source: SourceState) {
    await source.cleanup();
    const reader = downloadFromInfo(state.info, { format });
    source.buffer.changeType(format.mimeType!);
    return updateSourceBuffer(source.buffer, reader);
  }

  useEffect(() => {
    state.mediaSource.addEventListener("sourceopen", () => {
      setReady(true);
    });

    state.mediaSource.addEventListener("sourceclose", console.log);
    state.mediaSource.addEventListener("sourceended", console.log);
  }, []);

  useEffect(() => {
    if (!ready) return;

    setVideo(addSourceBuffer(state.formats.video[0]));
    setAudio(addSourceBuffer(state.formats.audio[0]));
  }, [ready]);

  async function changeVideo(event: ChangeEvent<HTMLSelectElement>) {
    if (!video) return;

    const format = state.formats.video[parseInt(event.currentTarget.value)];
    setVideo(await switchFormat(format, video));
  }

  async function changeAudio(event: ChangeEvent<HTMLSelectElement>) {
    if (!audio) return;

    const format = state.formats.audio[parseInt(event.currentTarget.value)];
    setAudio(await switchFormat(format, audio));
  }

  return (
    <div style={{ display: "flex" }}>
      <div>
        <select name="video" ref={register} onChange={changeVideo}>
          {state.formats.video.map(({ url, qualityLabel, mimeType }, index) => (
            <option key={url} value={index}>
              {qualityLabel} {mimeType}
            </option>
          ))}
        </select>
      </div>

      <div style={{ paddingLeft: 5 }}>
        <select name="audio" ref={register} onChange={changeAudio}>
          {state.formats.audio.map(({ url, mimeType, audioBitrate }, index) => (
            <option key={url} value={index}>
              {audioBitrate}bit {mimeType}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
