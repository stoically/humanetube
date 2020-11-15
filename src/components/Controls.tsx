import React, { useState, useEffect } from "react";
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
  const [videoFormat] = useState(() => {
    const storageType = localStorage.getItem("video.preferred.itag");

    if (storageType !== null) {
      for (const type of formats.video) {
        if (type.itag.toString() === storageType) {
          return type;
        }
      }
    }

    return formats.video[0];
  });

  const [audioFormat] = useState(() => {
    const storageType = localStorage.getItem("audio.preferred.itag");

    if (storageType !== null) {
      for (const type of formats.audio) {
        if (type.itag.toString() === storageType) {
          return type;
        }
      }
    }

    return formats.audio[0];
  });

  const video = useSourceBuffer({
    mediasource,
    videoElement,
    type: videoFormat.mimeType,
    readerFn: () => downloadFromInfo(info, { format: videoFormat }),
  });

  const audio = useSourceBuffer({
    mediasource,
    videoElement,
    type: audioFormat.mimeType,
    readerFn: () => downloadFromInfo(info, { format: audioFormat }),
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
        defaultValue={formats.video.findIndex(
          (format) => format.itag === videoFormat.itag
        )}
        data={formats.video.map(({ qualityLabel, mimeType }, index) => ({
          label: `${qualityLabel} ${mimeType}`,
          value: index,
        }))}
        onChange={(value) => {
          const format = formats.video[value];
          localStorage.setItem("video.preferred.itag", format.itag.toString());
          video.changeType({
            type: format.mimeType,
            readerFn: () => downloadFromInfo(info, { format }),
          });
        }}
      />
      <SelectPicker
        style={{ paddingRight: 10 }}
        placement="topStart"
        cleanable={false}
        searchable={false}
        defaultValue={formats.audio.findIndex(
          (format) => format.itag === audioFormat.itag
        )}
        data={formats.audio.map(({ audioBitrate, mimeType }, index) => ({
          label: `${audioBitrate}bit ${mimeType}`,
          value: index,
        }))}
        onChange={(value) => {
          const format = formats.audio[value];
          localStorage.setItem("audio.preferred.itag", format.itag.toString());
          audio.changeType({
            type: format.mimeType,
            readerFn: () => downloadFromInfo(info, { format }),
          });
        }}
      />
    </>
  );
}
