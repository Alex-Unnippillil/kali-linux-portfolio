export {};

type YouTubePlayer = {
  loadVideoById?: (id: string) => void;
  getCurrentTime?: () => number;
  getPlayerState?: () => number;
  pauseVideo?: () => void;
  playVideo?: () => void;
  seekTo?: (seconds: number, allowSeekAhead?: boolean) => void;
  destroy?: () => void;
};

type YouTubePlayerEvent = {
  target: YouTubePlayer;
  data?: number;
};

type YouTubePlayerOptions = {
  videoId?: string;
  host?: string;
  playerVars?: Record<string, unknown>;
  events?: {
    onReady?: (event: { target: YouTubePlayer }) => void;
    onStateChange?: (event: YouTubePlayerEvent) => void;
    onError?: (event: { target: YouTubePlayer; data?: unknown }) => void;
  };
} & Record<string, unknown>;

declare global {
  interface PictureInPictureWindowOptions {
    width?: number;
    height?: number;
  }

  interface Window {
    YT?: {
      Player: new (element: string | HTMLElement, options?: YouTubePlayerOptions) => YouTubePlayer;
      PlayerState?: Record<string, number>;
    };
    onYouTubeIframeAPIReady?: () => void;
    twttr?: any;
    documentPictureInPicture?: {
      requestWindow: (options?: PictureInPictureWindowOptions) => Promise<Window>;
    };
  }
}

