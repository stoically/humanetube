import React, { useEffect, useState } from "react";
import { getInfo, filterFormats, videoInfo } from "ytdl-core";
import { YtdlFormats } from "./YtdlFormats";
import { YtdlState } from "../types";
import { Button } from "rsuite";

export function Youtube(): JSX.Element {
  const [state, setState] = useState<{
    loading: boolean;
    error?: Error;
    id?: string;
    info?: videoInfo;
    ytdl?: YtdlState;
  }>({ loading: true });

  useEffect(() => {
    (async () => {
      const id = new URL(document.location.toString()).searchParams.get(
        "watch"
      );
      if (!id) {
        setState({ loading: false, error: new Error("Missing Video ID") });
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
            error: new Error("no valid video formats found"),
            id,
          });
          return;
        }

        if (info.videoDetails.isLiveContent) {
          setState({
            loading: false,
            error: new Error("livestreams currently not supported"),
            id,
          });
          return;
        }

        const mediaSource = new MediaSource();
        setState({
          loading: false,
          id,
          info,
          ytdl: {
            info,
            mediaSource,
            formats: { audio, video },
            videoSrc: URL.createObjectURL(mediaSource),
          },
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
    <div>
      {state.error ? (
        state.id ? (
          <div style={{ padding: 10 }}>
            <div>
              <div className="video-container">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${state.id}?rel=0`}
                  frameBorder="0"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
            <div style={{ padding: 10 }}>
              {state.error.toString()}, falling back to regular youtube
              embedding
            </div>
          </div>
        ) : (
          state.error.toString()
        )
      ) : state.ytdl ? (
        <div style={{ padding: 10 }}>
          <div style={{ paddingBottom: 10 }}>
            <video src={state.ytdl?.videoSrc} controls width="100%" />
          </div>
          <div style={{ padding: 5 }}>
            <h5>{state.info?.videoDetails.title}</h5>
            <div style={{ paddingTop: 5 }}>
              {state.info?.videoDetails.ownerChannelName},{" "}
              {state.info?.videoDetails.publishDate}
            </div>
          </div>
          <div style={{ paddingTop: 10 }}>
            <YtdlFormats state={state.ytdl} />
            <span style={{ paddingLeft: 10 }}>
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
          </div>
        </div>
      ) : (
        <div>Something went wrong</div>
      )}
    </div>
  );
}
