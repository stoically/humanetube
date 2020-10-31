import { videoFormat, videoInfo } from "ytdl-core";

declare global {
  interface SourceBuffer {
    changeType: (type: string) => void;
  }
}

export interface Formats {
  video: videoFormat[];
  audio: videoFormat[];
}

export interface YtdlState {
  info: videoInfo;
  formats: Formats;
  mediaSource: MediaSource;
  videoSrc: string;
}

export interface SourceState {
  buffer: SourceBuffer;
  reader: NodeJS.ReadableStream;
  cleanup: () => Promise<void>;
}
