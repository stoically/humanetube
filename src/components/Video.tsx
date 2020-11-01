import React, { RefObject } from "react";

interface Props {
  videoRef: RefObject<HTMLVideoElement>;
}

export function Video({ videoRef }: Props): JSX.Element {
  return <video ref={videoRef} controls />;
}
