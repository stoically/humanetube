import { useEffect, useState } from "react";
import PQueue from "p-queue";
import autoBind from "auto-bind";

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

interface SourceBufferStreamCtorArgs {
  readerFn: () => NodeJS.ReadableStream;
  buffer: SourceBuffer;
  videoElement: HTMLVideoElement;
  setReaderEnd: React.Dispatch<React.SetStateAction<boolean>>;
}

class SourceBufferStream {
  queue = new PQueue({ concurrency: 1 });
  buffer: SourceBuffer;
  reader: NodeJS.ReadableStream;
  readerFn: () => NodeJS.ReadableStream;
  videoElement: HTMLVideoElement;
  setReaderEnd: React.Dispatch<React.SetStateAction<boolean>>;
  bufferMax = Infinity;
  bufferLow = 0;
  bufferRemove = 0;
  readyToResume = Promise.resolve();
  _interval!: NodeJS.Timeout;
  missedData?: any;

  constructor({
    readerFn,
    buffer,
    videoElement,
    setReaderEnd,
  }: SourceBufferStreamCtorArgs) {
    this.buffer = buffer;
    this.videoElement = videoElement;
    this.setReaderEnd = setReaderEnd;
    this.readerFn = readerFn;
    this.reader = readerFn();
    autoBind(this);

    this.initialize();
  }

  initialize() {
    this.buffer.addEventListener("updateend", this.maybeResume);
    this.buffer.addEventListener("error", this.bufferError);
    this.reader.addListener("data", this.readerData);
    this.reader.addListener("end", this.readerEnd);
    this.videoElement.addEventListener("seeking", this.videoSeeking);
    this._interval = setInterval(async () => {
      this.queue.add(this.interval);
    }, 500);
  }

  bufferError(error: Event) {
    console.error("buffer listener error", error);
  }

  async cleanup() {
    this.reader.pause();
    clearInterval(this._interval);
    this.buffer.removeEventListener("updateend", this.maybeResume);
    this.buffer.removeEventListener("error", this.bufferError);
    this.reader.removeAllListeners();
    this.videoElement.removeEventListener("seeking", this.videoSeeking);
    await this.waitForUpdateEnd();
  }

  async readerData(data: any) {
    this.reader.pause();
    await this.readyToResume;
    try {
      if (this.buffer.updating) {
        await this.waitForUpdateEnd();
      }
      this.buffer.appendBuffer(data);
    } catch (error) {
      if (error.name !== "QuotaExceededError") {
        console.error("readerData error", error);
        throw error;
      } else {
        console.error("QuotaExceededError", error);

        if (this.bufferMax === Infinity) {
          const start = this.buffer.buffered.start(0);
          const end = this.buffer.buffered.end(0);
          this.bufferMax = end - start - 1;
          this.bufferLow = this.bufferMax * 0.25;
          this.bufferRemove = this.bufferLow * 0.25;
        }

        // TODO: this would need to be queued or otherwise handled sanely, since
        // it might happen that we didn't correctly appended the previous
        // missedData yet, breaking the buffer
        this.missedData = data;
      }
    }
  }

  async maybeResume() {
    await this.readyToResume;

    // TODO: actually we always want to resume until this.bufferMax, but this
    // tricky to coordinate with QuotaExceededError
    if (this.bufferMax === Infinity || this.forwardBuffer() < this.bufferLow) {
      this.reader.resume();
    }
  }

  readerEnd() {
    this.setReaderEnd(true);
  }

  async videoSeeking() {
    // if the buffer is ahead, remove it, since we can't handle multiple
    // TimeRanges yet
    if (this.bufferAhead()) {
      await this.cleanup();
      await this.removeBuffer(
        this.buffer.buffered.start(0),
        this.buffer.buffered.end(0)
      );

      this.reader = this.readerFn();
      this.initialize();
    }
  }

  async interval() {
    if (!this.buffer.buffered.length || !this.bufferLow || !this.bufferRemove)
      return;

    this.readyToResume = new Promise(async (resolve) => {
      await this.waitForUpdateEnd();

      if (this.previousBuffered() > this.bufferLow) {
        const start = this.buffer.buffered.start(0);
        const end = this.buffer.buffered.end(0);
        const remove = start + this.bufferRemove;
        await this.removeBuffer(start, remove > end ? end : remove);

        // try to append the data chunk we missed when exceeding the quota
        if (this.missedData) {
          try {
            this.buffer.appendBuffer(this.missedData);
            delete this.missedData;
          } catch (error) {
            // didn't work. next time.
          }
        }
      }

      await this.waitForUpdateEnd();
      resolve();
      this.maybeResume();
    });
  }

  waitForUpdateEnd() {
    return new Promise((resolve) => {
      if (!this.buffer.updating) {
        resolve();
      } else {
        const updateendListener = () => {
          this.buffer.removeEventListener("updateend", updateendListener);
          resolve();
        };
        this.buffer.addEventListener("updateend", updateendListener);
      }
    });
  }

  async removeBuffer(start: number, end: number) {
    this.buffer.remove(start, end);
    await this.waitForUpdateEnd();
  }

  totalBuffered() {
    if (!this.buffer.buffered.length) return 0;
    return this.buffer.buffered.end(0) - this.buffer.buffered.start(0);
  }

  forwardBuffer() {
    if (
      !this.buffer.buffered.length ||
      this.videoElement.currentTime >= this.buffer.buffered.end(0)
    ) {
      return 0;
    }

    return this.buffer.buffered.end(0) - this.videoElement.currentTime;
  }

  previousBuffered() {
    if (!this.buffer.buffered.length) return 0;

    if (this.videoElement.currentTime > this.buffer.buffered.end(0)) {
      return this.totalBuffered();
    } else {
      return this.videoElement.currentTime - this.buffer.buffered.start(0);
    }
  }

  bufferAhead() {
    if (!this.buffer.buffered.length) return false;

    return this.buffer.buffered.start(0) > this.videoElement.currentTime;
  }
}

export function useSourceBuffer({
  mediasource,
  videoElement,
  type,
  readerFn,
}: Props): Returns {
  const [stream, setStream] = useState<SourceBufferStream>();
  const [readerEnd, setReaderEnd] = useState(false);

  async function changeType({ type, readerFn }: ChangeTypeArgs) {
    if (!stream) throw new Error("SourceBufferStream not ready");
    await stream.cleanup();
    stream.buffer.changeType(type);
    setReaderEnd(false);
    stream.readerFn = readerFn;
    stream.reader = readerFn();
    stream.initialize();
  }

  useEffect(() => {
    mediasource.addEventListener("sourceopen", () => {
      const buffer = mediasource.addSourceBuffer(type);
      const stream = new SourceBufferStream({
        readerFn,
        buffer,
        videoElement,
        setReaderEnd,
      });

      setStream(stream);
    });
  }, []);

  return { changeType, readerEnd };
}
