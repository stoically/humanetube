import { RefObject, useEffect, useState } from "react";

export function useMediaSource(
  videoRef: RefObject<HTMLVideoElement>
): MediaSource {
  const [mediasource] = useState<MediaSource>(() => new MediaSource());

  useEffect(() => {
    if (!videoRef.current) {
      throw new Error("No `current` on `videoRef`");
    }

    videoRef.current.src = URL.createObjectURL(mediasource);
  }, []);

  return mediasource;
}
