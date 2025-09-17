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
    idleResetController?: import('../src/system/idleReset').IdleResetController;
  }
}

