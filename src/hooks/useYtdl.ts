import { useEffect, useState } from "react";
import * as ytdl from "ytdl-core";
import { Formats, VideoFormat } from "../types";

interface State {
  loading: boolean;
  id?: string;
  embed?: string;
  info?: ytdl.videoInfo;
  formats?: Formats;
  error?: Error;
}

export function useYtdl(id: string): State {
  const [state, setState] = useState<State>({ loading: true });

  useEffect(() => {
    (async () => {
      try {
        console.log("[debug] trying ytdl.getInfo", id);
        const info = await ytdl.getInfo(id);
        console.log("[debug] ytdl.getInfo", info);
        document.title = info.videoDetails.title;

        const video = ytdl
          .filterFormats(info.formats, "videoonly")
          .filter((format) => !!format.mimeType)
          // TODO: we filter all `webm` formats since the appending webm to the
          // source buffer acts weirdly and has multiple timeranges after a while
          // regardless whether buffer mode is `segments` or `sequence`
          .filter(
            (format) => !format.mimeType?.startsWith("video/webm")
          ) as VideoFormat[];

        const audio = ytdl
          .filterFormats(info.formats, "audioonly")
          .filter((format) => !!format.mimeType) as VideoFormat[];

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
        console.error("[debug] ytdl.getInfo failed", error);
        setState({ loading: false, embed: error.toString() });
      }
    })();
  }, []);

  return { ...state };
}
