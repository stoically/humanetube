import React, { ChangeEvent, RefObject, useEffect, useState } from "react";
import { videoFormat, downloadFromInfo, videoInfo } from "ytdl-core";
import { SelectPicker } from "rsuite";
import { SourceState, Formats } from "../types";

export function YtdlFormats({
  info,
  formats,
  mediaSource,
  videoElement,
}: {
  info: videoInfo;
  formats: Formats;
  mediaSource: MediaSource;
  videoElement: RefObject<HTMLVideoElement>;
}): JSX.Element {
  const [ready, setReady] = useState(false);
  const [video, setVideo] = useState<SourceState>();
  const [audio, setAudio] = useState<SourceState>();

  function addSourceBuffer(format: videoFormat): SourceState {
    const buffer = mediaSource.addSourceBuffer(format.mimeType!);
    const reader = downloadFromInfo(info, { format });
    return updateSourceBuffer(buffer, reader);
  }

  async function switchFormat(format: videoFormat, source: SourceState) {
    await source.cleanup();
    const reader = downloadFromInfo(info, { format });
    source.buffer.changeType(format.mimeType!);
    return updateSourceBuffer(source.buffer, reader);
  }

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
    reader.addListener("end", () => {
      mediaSource.endOfStream();
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

  async function changeVideoFormat(value: number) {
    if (!video) return;

    const format = formats.video[value];
    console.log(format, video);
    setVideo(await switchFormat(format, video));
  }

  async function changeAudioFormat(event: ChangeEvent<HTMLSelectElement>) {
    if (!audio) return;

    const format = formats.audio[parseInt(event.currentTarget.value)];
    setAudio(await switchFormat(format, audio));
  }

  useEffect(() => {
    mediaSource.addEventListener("sourceopen", () => {
      setReady(true);
    });

    mediaSource.addEventListener("sourceclose", console.log);
    mediaSource.addEventListener("sourceended", console.log);
  }, []);

  useEffect(() => {
    if (!ready) return;

    setVideo(addSourceBuffer(formats.video[0]));
    setAudio(addSourceBuffer(formats.audio[0]));
  }, [ready]);

  return (
    <>
      <SelectPicker
        style={{ paddingRight: 10 }}
        placement="topStart"
        cleanable={false}
        searchable={false}
        defaultValue={0}
        data={formats.video.map(({ qualityLabel, mimeType }, index) => ({
          label: `${qualityLabel} ${mimeType}`,
          value: index,
        }))}
        onChange={changeVideoFormat}
      />
      <SelectPicker
        placement="topStart"
        cleanable={false}
        searchable={false}
        defaultValue={0}
        data={formats.audio.map(({ audioBitrate, mimeType }, index) => ({
          label: `${audioBitrate}bit ${mimeType}`,
          value: index,
        }))}
        onChange={changeAudioFormat}
      />
    </>
  );
}
