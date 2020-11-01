import React, { createRef, useState } from "react";
import { Button } from "rsuite";
import { useYtdl } from "~/hooks/useYtdl";
import { Controls } from "./Controls";
import { Embed } from "./Embed";
import { Info } from "./Info";
import { Video } from "./Video";

export function YouTube(): JSX.Element {
  const videoRef = createRef<HTMLVideoElement>();
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

  if (!info || !formats) {
    throw new Error("Unexpectedly missing `info` or `formats`");
  }

  const video = !embed ? <Video videoRef={videoRef} /> : <Embed id={id} />;

  const controls = !embed ? (
    <Controls videoRef={videoRef} info={info} formats={formats} />
  ) : (
    <div
      style={{ paddingBottom: 15 }}
    >{`Using regular YouTube embedding because: ${embed}`}</div>
  );

  return (
    <>
      <div className="theater">{video}</div>
      <div>
        <Info info={info} />

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
