import { RefObject, useEffect, useState } from "react";

export function useMediaSource(
  videoRef: RefObject<HTMLVideoElement>
): MediaSource | undefined {
  const [mediasource, setMediaSource] = useState<MediaSource>();

  useEffect(() => {
    if (!videoRef.current) {
      throw new Error("No `current` on `videoRef`");
    }

    const mediasource = new MediaSource();
    videoRef.current.src = URL.createObjectURL(mediasource);
    mediasource.addEventListener("sourceopen", () => {
      setMediaSource(mediasource);
    });

    mediasource.addEventListener("sourceclose", console.log);
    mediasource.addEventListener("sourceended", console.log);
  }, []);

  return mediasource;
}
