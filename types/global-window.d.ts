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
  }

  interface CustomA2HSEvent extends Event {}

  interface WindowEventMap {
    'a2hs:available': CustomA2HSEvent;
  }
}

