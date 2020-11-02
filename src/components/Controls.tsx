import React, { RefObject, useEffect } from "react";
import { downloadFromInfo, videoInfo } from "ytdl-core";
import { SelectPicker } from "rsuite";
import { Formats } from "~/types";
import { useMediaSource } from "~/hooks/useMediaSource";
import { useSourceBuffer } from "~/hooks/useSourceBuffer";

interface Props {
  videoRef: RefObject<HTMLVideoElement>;
  info: videoInfo;
  formats: Formats;
}

export function Controls({ videoRef, info, formats }: Props): JSX.Element {
  const mediasource = useMediaSource(videoRef);

  const video = useSourceBuffer({
    mediasource,
    videoRef,
    type: formats.video[0].mimeType,
    reader: downloadFromInfo(info, { format: formats.video[0] }),
  });

  const audio = useSourceBuffer({
    mediasource,
    videoRef,
    type: formats.audio[0].mimeType,
    reader: downloadFromInfo(info, { format: formats.audio[0] }),
  });

  useEffect(() => {
    mediasource.addEventListener("sourceopen", console.log);
    mediasource.addEventListener("sourceclose", console.log);
    mediasource.addEventListener("sourceended", console.log);
  }, []);

  useEffect(() => {
    if (video.readerEnd && audio.readerEnd) {
      mediasource.endOfStream();
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
            reader: downloadFromInfo(info, { format: formats.video[value] }),
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
            reader: downloadFromInfo(info, { format: formats.audio[value] }),
          })
        }
      />
    </>
  );
}
