import "setimmediate";
import "rsuite/lib/styles/themes/dark/index.less";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { getInfo, filterFormats } from "ytdl-core";
import { Formats } from "./formats";
import { State } from "./types";

function Youtube() {
  const id = new URL(document.location.toString()).searchParams.get("watch");
  const [state, setState] = useState<State>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    (async () => {
      try {
        if (!id) {
          throw new Error("Missing Video ID");
        }

        const info = await getInfo(id);
        console.log("[debug] ytdl.getInfo", info);
        document.title = info.videoDetails.title;

        const video = filterFormats(info.formats, "videoonly");
        const audio = filterFormats(info.formats, "audioonly");
        const formats = { video, audio };

        const mediaSource = new MediaSource();
        setState({
          info,
          mediaSource,
          formats,
          videoSrc: URL.createObjectURL(mediaSource),
        });
      } catch (error) {
        setError(error);
      }
    })();
  }, []);

  if (error) {
    console.error(error);
    return <div>{error.toString()}</div>;
  }

  if (!state) {
    return <div>Focusing...</div>;
  }

  return (
    <div>
      <div style={{ padding: 10 }}>
        <video src={state.videoSrc} controls width="100%" />
      </div>
      <div style={{ padding: 15 }}>
        <h5>{state.info.videoDetails.title}</h5>
        <div style={{ paddingTop: 5 }}>
          {state.info.videoDetails.ownerChannelName},{" "}
          {state.info.videoDetails.publishDate}
        </div>
      </div>
      <div style={{ padding: 10 }}>
        <Formats state={state} />
      </div>
    </div>
  );
}

const App = <Youtube />;

ReactDOM.render(App, document.getElementById("app"));
