import React from "react";
import { videoInfo } from "ytdl-core";

interface Props {
  info: videoInfo;
}

export function Info({ info }: Props): JSX.Element {
  return (
    <div style={{ padding: 15 }}>
      <h5>{info.videoDetails.title}</h5>
      <div style={{ paddingTop: 5 }}>
        {info.videoDetails.ownerChannelName}, {info.videoDetails.publishDate}
      </div>
    </div>
  );
}
