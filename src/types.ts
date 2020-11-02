import { videoFormat } from "ytdl-core";

declare global {
  interface SourceBuffer {
    // https://developer.mozilla.org/en-US/docs/Web/API/SourceBuffer/changeType
    changeType: (type: string) => void;
  }
}

export interface VideoFormat extends videoFormat {
  mimeType: string;
}

export interface Formats {
  video: VideoFormat[];
  audio: VideoFormat[];
}
