import { useEffect, useState } from "react";

interface Props {
  mediasource: MediaSource;
  videoElement: HTMLVideoElement;
  type: string;
  reader: NodeJS.ReadableStream;
}

interface Returns {
  readerEnd: boolean;
  changeType({ type, reader }: ChangeTypeArgs): void;
}

interface ChangeTypeArgs {
  type: string;
  reader: NodeJS.ReadableStream;
}

interface StreamArgs {
  reader: NodeJS.ReadableStream;
  buffer: SourceBuffer;
}

interface SourceState {
  buffer: SourceBuffer;
  reader: NodeJS.ReadableStream;
  cleanup: () => Promise<void>;
}

const BUFFER_HIGH = 60; // secs
const BUFFER_LOW = 30; // secs
const BUFFER_REMOVE = 15; // secs

export function useSourceBuffer({
  mediasource,
  videoElement,
  type,
  reader,
}: Props): Returns {
  const [state, setState] = useState<SourceState>();
  const [readerEnd, setReaderEnd] = useState(false);

  async function changeType({ type, reader }: ChangeTypeArgs) {
    if (!state) throw new Error("buffer not ready");

    await state.cleanup();
    state.buffer.changeType(type);
    setReaderEnd(false);
    setState(stream({ reader, buffer: state.buffer }));
  }

  function stream({ reader, buffer }: StreamArgs) {
    let buffering = true;

    function totalBuffered() {
      return buffer.buffered.end(0) - videoElement.currentTime;
    }

    function prevBuffered() {
      return videoElement.currentTime - buffer.buffered.start(0);
    }

    async function timeupdate() {
      if (!buffer.buffered.length) return;

      if (prevBuffered() > BUFFER_LOW) {
        await removePreviousBuffer();
      }

      if (!buffering && totalBuffered() < BUFFER_LOW) {
        buffering = true;
        reader.resume();
      }
    }
    videoElement.addEventListener("timeupdate", timeupdate);

    function updateendListener() {
      if (totalBuffered() < BUFFER_HIGH) {
        buffering = false;
        reader.resume();
      }
    }

    function removePreviousBuffer() {
      return new Promise((resolve) => {
        function updateendListener() {
          buffer.removeEventListener("updateend", updateendListener);
          resolve();
        }
        buffer.addEventListener("updateend", updateendListener);
        const start = buffer.buffered.start(0);
        buffer.remove(start, start + BUFFER_REMOVE);
      });
    }

    buffer.addEventListener("updateend", updateendListener);
    buffer.addEventListener("error", console.error);
    reader.addListener("data", (data) => {
      reader.pause();
      try {
        buffer.appendBuffer(data);
      } catch (error) {
        // TODO: properly handle error.name === "QuotaExceededError"
        alert(error.toString());
        console.error(error);
        throw error;
      }
    });
    reader.addListener("end", () => {
      setReaderEnd(true);
    });

    function cleanup(): Promise<void> {
      return new Promise((resolve) => {
        videoElement.removeEventListener("timeupdate", timeupdate);
        buffer.removeEventListener("updateend", updateendListener);
        buffer.removeEventListener("error", console.error);
        reader.removeAllListeners();
        reader.pause();

        if (buffer.updating) {
          function abortListener() {
            buffer.removeEventListener("updateend", abortListener);
            resolve();
          }

          buffer.addEventListener("updateend", abortListener);
          buffer.abort();
        } else {
          resolve();
        }
      });
    }

    return { buffer, reader, readerEnd: false, cleanup };
  }

  useEffect(() => {
    mediasource.addEventListener("sourceopen", () => {
      const buffer = mediasource.addSourceBuffer(type);
      setState(stream({ reader, buffer }));
    });
  }, []);

  return { changeType, readerEnd };
}
