import React, { useEffect, useRef, useState } from "react";
import { getInfo, filterFormats, videoInfo } from "ytdl-core";
import { YtdlFormats } from "./YtdlFormats";
import { Formats } from "../types";
import { Button } from "rsuite";

export function Youtube(): JSX.Element {
  const videoElement = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<{
    loading: boolean;
    id?: string;
    error?: string;
    info?: videoInfo;
    formats?: Formats;
    mediaSource?: MediaSource;
    videoSrc?: string;
  }>({ loading: true });

  useEffect(() => {
    (async () => {
      const id = new URL(document.location.toString()).searchParams.get(
        "watch"
      );
      if (!id) {
        setState({
          loading: false,
          error: "Unrecoverable error: No Youtube Video ID found",
        });
        return;
      }

      try {
        const info = await getInfo(id);
        console.log("[debug] ytdl.getInfo", info);
        document.title = info.videoDetails.title;

        const video = filterFormats(info.formats, "videoonly");
        const audio = filterFormats(info.formats, "audioonly");
        if (!video.length && !audio.length) {
          setState({
            loading: false,
            id,
            info,
            error:
              "no valid video formats found, using regular youtube embedding",
          });
          return;
        }

        if (info.videoDetails.isLiveContent) {
          setState({
            loading: false,
            id,
            info,
            error:
              "livestreams currently not supported, using regular youtube embedding",
          });
          return;
        }

        const mediaSource = new MediaSource();
        setState({
          loading: false,
          id,
          info,
          mediaSource,
          formats: { audio, video },
          videoSrc: URL.createObjectURL(mediaSource),
        });
      } catch (error) {
        setState({ loading: false, error, id });
      }
    })();
  }, []);

  if (state.loading) {
    return <div>Focusing...</div>;
  }

  return (
    <>
      <div className="theater">
        {!state.error && state.videoSrc ? (
          <video ref={videoElement} src={state.videoSrc} controls />
        ) : (
          state.id && (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${state.id}?rel=0`}
              frameBorder="0"
              allowFullScreen
            ></iframe>
          )
        )}
      </div>

      <div>
        {state.info && (
          <div style={{ padding: 15 }}>
            <h5>{state.info.videoDetails.title}</h5>
            <div style={{ paddingTop: 5 }}>
              {state.info.videoDetails.ownerChannelName},{" "}
              {state.info.videoDetails.publishDate}
            </div>
          </div>
        )}
        {state.error && (
          <div style={{ paddingLeft: 15 }}>{state.error.toString()}</div>
        )}
        <div style={{ padding: 10 }}>
          {state.info && state.formats && state.mediaSource && (
            <YtdlFormats
              info={state.info}
              formats={state.formats}
              mediaSource={state.mediaSource}
              videoElement={videoElement}
            />
          )}
          {state.id && (
            <span style={{ paddingLeft: state.formats ? 10 : 5 }}>
              <Button
                onClick={() =>
                  browser.tabs.create({
                    url: `https://www.youtube.com/watch?v=${state.id}`,
                  })
                }
                appearance="ghost"
              >
                Broken? Open on YouTube
              </Button>
            </span>
          )}
        </div>
      </div>
    </>
  );
}
