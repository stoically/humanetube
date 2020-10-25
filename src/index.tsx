import React, { createRef, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useForm } from "react-hook-form";
import youtubedl from "ytdl-core";

function Youtube() {
  const id = new URL(document.location.toString()).searchParams.get("watch");
  const videoRef = createRef<HTMLVideoElement>();
  const audioRef = createRef<HTMLAudioElement>();
  const [info, setInfo] = useState<youtubedl.videoInfo>();
  const [video, setVideo] = useState<youtubedl.videoFormat>();
  const [audio, setAudio] = useState<youtubedl.videoFormat>();
  const [hasAudio, setHasAudio] = useState(false);
  const [error, setError] = useState();

  const { register, watch } = useForm();

  function audioOnlyFormats() {
    return info?.formats.filter((info) => info.hasAudio && !info.hasVideo);
  }

  function videoFormats() {
    return info?.formats.filter((info) => info.hasVideo);
  }

  useEffect(() => {
    (async () => {
      try {
        if (!id) {
          throw new Error("Missing Video ID");
        }
        const result = await youtubedl.getInfo(id, { quality: "high" });
        console.log("[debug] youtubedl.getInfo", result);

        setInfo(result);
        setVideo(result.formats[0]);
        setHasAudio(result.formats[0].hasAudio);

        if (!result.formats[0].hasAudio) {
          setAudio(audioOnlyFormats()?.[0]);
        }
      } catch (error) {
        setError(error.toString());
      }
    })();
  }, []);

  const values = watch();
  useEffect(() => {
    if (info && values.video !== undefined) {
      const video = info.formats[parseInt(values.video)];
      setVideo(video);
      setHasAudio(video.hasAudio);
    }

    if (info && values.audio !== undefined) {
      const audio = info.formats[parseInt(values.audio)];
      setAudio(audio);
    }
  }, [values]);

  function onPlay() {
    if (!video || !audioRef?.current || !videoRef?.current) return;

    if (!video.hasAudio) {
      audioRef.current.currentTime = videoRef.current.currentTime;
      audioRef.current.play();
    }
  }

  function onPause() {
    if (!video || !audioRef?.current) return;

    if (!video.hasAudio) {
      audioRef.current.pause();
    }
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!info || !video) {
    return <div>Focusing...</div>;
  }

  return (
    <div>
      <div style={{ padding: 5 }}>
        <video
          ref={videoRef}
          src={video.url}
          controls
          width="100%"
          onPlay={onPlay}
          onPause={onPause}
        />
        {!hasAudio && audio ? <audio ref={audioRef} src={audio.url} /> : null}
      </div>

      <div style={{ padding: 5 }}>{info.videoDetails.title}</div>

      <div style={{ display: "flex", padding: 5 }}>
        <div>
          <select name="video" ref={register}>
            {videoFormats()?.map(
              (
                {
                  url,
                  qualityLabel,
                  mimeType,
                  hasAudio,
                  audioCodec,
                  audioBitrate,
                },
                index
              ) => (
                <option key={url} value={index}>
                  {qualityLabel} {mimeType}
                  {hasAudio
                    ? `; audio: ${audioCodec} ${audioBitrate}bit`
                    : null}
                </option>
              )
            )}
          </select>
        </div>

        <div style={{ paddingLeft: 5 }}>
          <select disabled={hasAudio} name="audio" ref={register}>
            {audioOnlyFormats()?.map(
              ({ url, mimeType, audioBitrate }, index) => (
                <option
                  key={url}
                  value={index}
                >{`audio: ${audioBitrate}bit ${mimeType}`}</option>
              )
            )}
          </select>
        </div>
      </div>
    </div>
  );
}

const App = <Youtube />;

ReactDOM.render(App, document.getElementById("app"));
