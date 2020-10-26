import React, { ChangeEvent, useEffect, useState } from "react";
import { videoFormat, downloadFromInfo } from "ytdl-core";
import { SelectPicker } from "rsuite";
import { State, SourceState } from "../types";

export function Formats({ state }: { state: State }): JSX.Element {
  const [ready, setReady] = useState(false);
  const [video, setVideo] = useState<SourceState>();
  const [audio, setAudio] = useState<SourceState>();

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

  async function changeVideo(value: number) {
    if (!video) return;

    const format = state.formats.video[value];
    console.log(format, video);
    setVideo(await switchFormat(format, video));
  }

  async function changeAudio(event: ChangeEvent<HTMLSelectElement>) {
    if (!audio) return;

    const format = state.formats.audio[parseInt(event.currentTarget.value)];
    setAudio(await switchFormat(format, audio));
  }

  return (
    <>
      <SelectPicker
        style={{ paddingRight: 10 }}
        placement="topStart"
        cleanable={false}
        searchable={false}
        defaultValue={0}
        data={state.formats.video.map(({ qualityLabel, mimeType }, index) => ({
          label: `${qualityLabel} ${mimeType}`,
          value: index,
        }))}
        onChange={changeVideo}
      />
      <SelectPicker
        placement="topStart"
        cleanable={false}
        searchable={false}
        defaultValue={0}
        data={state.formats.audio.map(({ audioBitrate, mimeType }, index) => ({
          label: `${audioBitrate}bit ${mimeType}`,
          value: index,
        }))}
        onChange={changeAudio}
      />
    </>
  );
}
