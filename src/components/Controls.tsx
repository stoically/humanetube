import React, { useEffect } from "react";
import { downloadFromInfo, videoInfo } from "ytdl-core";
import { SelectPicker } from "rsuite";
import { Formats } from "~/types";
import { useSourceBuffer } from "~/hooks/useSourceBuffer";

interface Props {
  mediasource: MediaSource;
  videoElement: HTMLVideoElement;
  info: videoInfo;
  formats: Formats;
}

export function Controls({
  mediasource,
  videoElement,
  info,
  formats,
}: Props): JSX.Element {
  const video = useSourceBuffer({
    mediasource,
    videoElement,
    type: formats.video[0].mimeType,
    readerFn: () => downloadFromInfo(info, { format: formats.video[0] }),
  });

  const audio = useSourceBuffer({
    mediasource,
    videoElement,
    type: formats.audio[0].mimeType,
    readerFn: () => downloadFromInfo(info, { format: formats.audio[0] }),
  });

  useEffect(() => {
    mediasource.addEventListener("sourceopen", console.log);
    mediasource.addEventListener("sourceclose", console.log);
    mediasource.addEventListener("sourceended", console.log);
  }, []);

  useEffect(() => {
    try {
      if (mediasource.readyState !== "open") return;

      if (video.readerEnd && audio.readerEnd) {
        mediasource.endOfStream();
      }
    } catch (error) {
      console.error("endOfStream error", error);
    }
  }, [video.readerEnd, audio.readerEnd]);

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
        onChange={(value) =>
          video.changeType({
            type: formats.video[value].mimeType,
            readerFn: () =>
              downloadFromInfo(info, { format: formats.video[value] }),
          })
        }
      />
      <SelectPicker
        style={{ paddingRight: 10 }}
        placement="topStart"
        cleanable={false}
        searchable={false}
        defaultValue={0}
        data={formats.audio.map(({ audioBitrate, mimeType }, index) => ({
          label: `${audioBitrate}bit ${mimeType}`,
          value: index,
        }))}
        onChange={(value) =>
          audio.changeType({
            type: formats.audio[value].mimeType,
            readerFn: () =>
              downloadFromInfo(info, { format: formats.audio[value] }),
          })
        }
      />
    </>
  );
}
