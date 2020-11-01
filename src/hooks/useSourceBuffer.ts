import { useState } from "react";
import { SourceState } from "~/types";

export function useSourceBuffer(mediasource?: MediaSource) {
  const [state, setState] = useState<SourceState>();

  function add(format: string, reader: NodeJS.ReadableStream) {
    const buffer = mediasource!.addSourceBuffer(format);
    setState(stream(buffer, reader));
  }

  async function change(format: string, reader: NodeJS.ReadableStream) {
    await state!.cleanup();

    state!.buffer.changeType(format);
    setState(stream(state!.buffer, reader));
  }

  function stream(buffer: SourceBuffer, reader: NodeJS.ReadableStream) {
    function updateendListener() {
      reader.resume();
    }
    buffer.addEventListener("updateend", updateendListener);
    buffer.addEventListener("error", console.error);
    reader.addListener("data", (data) => {
      reader.pause();
      buffer.appendBuffer(data);
    });
    // reader.addListener("end", () => {
    //   mediasource!.endOfStream();
    // });

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

    return { buffer, reader, cleanup };
  }

  return { add, change };
}
