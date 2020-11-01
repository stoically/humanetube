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
  const video = useSourceBuffer(mediasource);
  const audio = useSourceBuffer(mediasource);

  async function changeVideoFormat(value: number) {
    if (!video || !formats) return;

    const format = formats.video[value];
    const reader = downloadFromInfo(info, { format });
    video.change(format.mimeType!, reader);
  }

  async function changeAudioFormat(value: number) {
    if (!audio || !formats) return;

    const format = formats.audio[value];
    const reader = downloadFromInfo(info, { format });
    audio.change(format.mimeType!, reader);
  }

  useEffect(() => {
    if (!mediasource) return;

    const videoFormat = formats.video[0];
    video.add(
      videoFormat.mimeType!,
      downloadFromInfo(info, { format: videoFormat })
    );

    const audioFormat = formats.audio[0];
    audio.add(
      audioFormat.mimeType!,
      downloadFromInfo(info, { format: audioFormat })
    );
  }, [mediasource]);

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
        style={{ paddingRight: 10 }}
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
