import type { StartupTimelineWindowPayload } from '../lib/startupTimeline';

export {};

declare global {
  interface PictureInPictureWindowOptions {
    width?: number;
    height?: number;
  }

  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    twttr?: any;
    documentPictureInPicture?: {
      requestWindow: (options?: PictureInPictureWindowOptions) => Promise<Window>;
    };
    __STARTUP_TIMELINE__?: StartupTimelineWindowPayload;
  }
}

