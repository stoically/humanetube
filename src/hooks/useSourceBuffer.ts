import { RefObject, useEffect, useState } from "react";

interface Props {
  mediasource: MediaSource;
  videoRef: RefObject<HTMLVideoElement>;
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

export function useSourceBuffer({
  mediasource,
  videoRef,
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
    function updateendListener() {
      reader.resume();
    }
    buffer.addEventListener("updateend", updateendListener);
    buffer.addEventListener("error", console.error);
    reader.addListener("data", (data) => {
      reader.pause();
      buffer.appendBuffer(data);
    });
    reader.addListener("end", () => {
      setReaderEnd(true);
    });

    function cleanup(): Promise<void> {
      return new Promise((resolve) => {
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
