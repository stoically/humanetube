import React, { useCallback, useState } from "react";
import { Button } from "rsuite";
import { useYtdl } from "~/hooks/useYtdl";
import { Controls } from "./Controls";

export function Theater(): JSX.Element {
  const [mediasource] = useState<MediaSource>(() => new MediaSource());
  const [videoElement, setVideoElement] = useState<HTMLVideoElement>();

  const videoRef = useCallback((node: HTMLVideoElement) => {
    if (node !== null) {
      node.src = URL.createObjectURL(mediasource);
      setVideoElement(node);
    }
  }, []);

  const [id] = useState(() => {
    const id = new URL(document.location.toString()).searchParams.get("watch");

    if (!id) {
      throw new Error("No Youtube Video ID found");
    }

    return id;
  });

  const { loading, embed, info, formats } = useYtdl(id);

  if (loading) {
    return <div>Focusing...</div>;
  }

  const video = !embed ? (
    <video ref={videoRef} controls />
  ) : (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${id}`}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    ></iframe>
  );

  const controls =
    !embed && formats && info ? (
      videoElement && (
        <Controls
          videoElement={videoElement}
          mediasource={mediasource}
          info={info}
          formats={formats}
        />
      )
    ) : (
      <div
        style={{ paddingBottom: 15 }}
      >{`Using regular YouTube embedding because: ${embed}`}</div>
    );

  return (
    <>
      <div className="theater">{video}</div>
      <div>
        {info && (
          <div style={{ padding: 15 }}>
            <h5>{info.videoDetails.title}</h5>
            <div style={{ paddingTop: 5 }}>
              {info.videoDetails.ownerChannelName},{" "}
              {info.videoDetails.publishDate}
            </div>
          </div>
        )}

        <div style={{ padding: 15 }}>
          {controls}

          <span>
            <Button
              href={`https://www.youtube.com/watch?v=${id}`}
              target="_blank"
              appearance="ghost"
            >
              Broken? Open on YouTube
            </Button>
          </span>
        </div>
      </div>
    </>
  );
}

declare global {
  interface HTMLMediaElement {
    playing: boolean;
  }
}

Object.defineProperty(HTMLMediaElement.prototype, "playing", {
  get: function () {
    return !!(
      this.currentTime > 0 &&
      !this.paused &&
      !this.ended &&
      this.readyState > 2
    );
  },
});
