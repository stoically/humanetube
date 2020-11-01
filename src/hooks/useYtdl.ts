import { useEffect, useState } from "react";
import { useErrorHandler } from "react-error-boundary";
import * as ytdl from "ytdl-core";
import { Formats } from "../types";

interface State {
  loading: boolean;
  id?: string;
  embed?: string;
  info?: ytdl.videoInfo;
  formats?: Formats;
}

export function useYtdl(id: string): State {
  const handleError = useErrorHandler();
  const [state, setState] = useState<State>({ loading: true });

  useEffect(() => {
    (async () => {
      try {
        const info = await ytdl.getInfo(id);
        console.log("[debug] ytdl.getInfo", info);
        document.title = info.videoDetails.title;

        const video = ytdl.filterFormats(info.formats, "videoonly");
        const audio = ytdl.filterFormats(info.formats, "audioonly");

        let embed;
        if (!video.length && !audio.length) {
          embed = "no valid video formats found";
        } else if (info.videoDetails.isLiveContent) {
          embed = "livestreams currently not supported";
        }

        const formats = { audio, video };
        setState({
          loading: false,
          id,
          info,
          formats,
          embed,
        });
      } catch (error) {
        handleError(error);
      }
    })();
  }, []);

  return { ...state };
}
