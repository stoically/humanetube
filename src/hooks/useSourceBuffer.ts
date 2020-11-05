import { useEffect, useState } from "react";
// import pDebounce from "p-debounce";
import pLimit from "p-limit";

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

const limit = pLimit(1);

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

    const bufferCheck = () =>
      limit(async () => {
        console.log("buffercheck start", buffer.buffered.length);
        if (!buffer.buffered.length) return;

        if (bufferAhead()) {
          console.log("removing full buffer");
          await cleanup();
          await removeBuffer(buffer.buffered.start(0), buffer.buffered.end(0));
          setState(stream({ readerFn, buffer }));
          console.log("buffercheck end");
          return;
        }

        if (previousBuffered() > BUFFER_LOW) {
          const start = buffer.buffered.start(0);
          const end = buffer.buffered.end(0);
          const remove = start + BUFFER_REMOVE;
          console.log(
            "removing previous buffer",
            start,
            remove > end ? end : remove
          );
          await removeBuffer(start, remove > end ? end : remove);
        }

        if (forwardBuffer() < BUFFER_HIGH) {
          console.log("resuming");
          videoElement.removeEventListener("timeupdate", bufferCheck);
          reader.resume();
        } else {
          videoElement.addEventListener("timeupdate", bufferCheck);
        }

        console.log("buffercheck end");
      });

    videoElement.addEventListener("seeking", bufferCheck);

    async function updateendListener() {
      await bufferCheck();
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
