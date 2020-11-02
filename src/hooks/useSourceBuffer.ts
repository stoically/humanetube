import { useEffect, useState } from "react";

interface Props {
  mediasource: MediaSource;
  videoElement: HTMLVideoElement;
  type: string;
  readerFn: () => NodeJS.ReadableStream;
}

interface Returns {
  readerEnd: boolean;
  changeType({ type, readerFn }: ChangeTypeArgs): void;
}

interface ChangeTypeArgs {
  type: string;
  readerFn: () => NodeJS.ReadableStream;
}

interface StreamArgs {
  readerFn: () => NodeJS.ReadableStream;
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
  readerFn,
}: Props): Returns {
  const [state, setState] = useState<SourceState>();
  const [readerEnd, setReaderEnd] = useState(false);

  async function changeType({ type, readerFn }: ChangeTypeArgs) {
    if (!state) throw new Error("buffer not ready");

    await state.cleanup();
    state.buffer.changeType(type);
    setReaderEnd(false);
    setState(stream({ readerFn, buffer: state.buffer }));
  }

  function stream({ readerFn, buffer }: StreamArgs) {
    const reader = readerFn();
    let buffering = true;

    function totalBuffered() {
      if (!buffer.buffered.length) return 0;
      return buffer.buffered.end(0) - buffer.buffered.start(0);
    }

    function forwardBuffer() {
      if (
        !buffer.buffered.length ||
        videoElement.currentTime >= buffer.buffered.end(0)
      ) {
        return 0;
      }

      return buffer.buffered.end(0) - videoElement.currentTime;
    }

    function previousBuffered() {
      if (!buffer.buffered.length) return 0;

      if (videoElement.currentTime > buffer.buffered.end(0)) {
        return totalBuffered();
      } else {
        return videoElement.currentTime - buffer.buffered.start(0);
      }
    }

    function bufferAhead() {
      if (!buffer.buffered.length) return false;

      return buffer.buffered.start(0) > videoElement.currentTime;
    }

    let checkingBuffer = false;
    async function bufferCheck() {
      if (checkingBuffer) return;
      if (!buffer.buffered.length) return;
      if (buffer.updating) return;
      checkingBuffer = true;

      if (bufferAhead()) {
        // this happens when seeking to a position we already removed previously
        await cleanup();
        if (buffer.buffered.length) {
          await removeBuffer(buffer.buffered.start(0), buffer.buffered.end(0));
        }
        setState(stream({ readerFn, buffer }));
        return;
      }

      if (!buffering && previousBuffered() > BUFFER_LOW) {
        const start = buffer.buffered.start(0);
        const end = buffer.buffered.end(0);
        const remove = start + BUFFER_REMOVE;
        await removeBuffer(start, remove > end ? end : remove);
      }

      if (!buffering && forwardBuffer() < BUFFER_LOW) {
        buffering = true;
        reader.resume();
      }

      checkingBuffer = false;
    }
    videoElement.addEventListener("timeupdate", bufferCheck);
    videoElement.addEventListener("seeking", bufferCheck);

    function updateendListener() {
      if (forwardBuffer() < BUFFER_HIGH) {
        reader.resume();
      } else {
        buffering = false;
      }
    }

    function removeBuffer(start: number, end: number) {
      return new Promise((resolve) => {
        if (!buffer.buffered.length) return;

        function updateendListener() {
          buffer.removeEventListener("updateend", updateendListener);
          resolve();
        }
        buffer.addEventListener("updateend", updateendListener);
        buffer.remove(start, end);
      });
    }

    buffer.addEventListener("updateend", updateendListener);
    buffer.addEventListener("error", console.error);
    reader.addListener("data", (data) => {
      buffering = true;
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
        reader.pause();
        videoElement.removeEventListener("timeupdate", bufferCheck);
        videoElement.removeEventListener("seeking", bufferCheck);
        buffer.removeEventListener("updateend", updateendListener);
        buffer.removeEventListener("error", console.error);
        reader.removeAllListeners();

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
      setState(stream({ readerFn, buffer }));
    });
  }, []);

  return { changeType, readerEnd };
}
