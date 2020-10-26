import { videoInfo, videoFormat } from "ytdl-core";

declare global {
  interface SourceBuffer {
    changeType: (type: string) => void;
  }
}

export interface State {
  info: videoInfo;
  formats: {
    video: videoFormat[];
    audio: videoFormat[];
  };
  mediaSource: MediaSource;
  videoSrc: string;
}

export interface SourceState {
  buffer: SourceBuffer;
  reader: NodeJS.ReadableStream;
  cleanup: () => Promise<void>;
}
