export interface TrackState {
  paused: boolean;
  track: {
    name: string;
    artists: { name: string }[];
    album: { name: string; images: { url: string; width?: number; height?: number }[] };
  };
}

type Controller = {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  addListener?: (event: string, cb: (state: any) => void) => void;
  removeListener?: (event: string, cb: (state: any) => void) => void;
  getCurrentState?: () => Promise<TrackState | null>;
};

export const initMediaSession = (controller: Controller) => {
  if (typeof navigator === 'undefined' || !(navigator as any).mediaSession) return;

  const updateMetadata = (state: any) => {
    const data = state?.data || state;
    if (!data?.track) return;
    const track = data.track;
    (navigator as any).mediaSession.metadata = new (window as any).MediaMetadata({
      title: track.name,
      artist: track.artists?.map((a: any) => a.name).join(', '),
      album: track.album?.name,
      artwork: track.album?.images?.map((img: any) => ({
        src: img.url,
        sizes: img.width && img.height ? `${img.width}x${img.height}` : undefined,
        type: 'image/jpeg',
      })) || [],
    });
  };

  controller.addListener?.('playback_update', updateMetadata);
  controller.getCurrentState?.().then(updateMetadata).catch(() => {});

  (navigator as any).mediaSession.setActionHandler('play', () => controller.play());
  (navigator as any).mediaSession.setActionHandler('pause', () => controller.pause());
  (navigator as any).mediaSession.setActionHandler('nexttrack', () => controller.next());
  (navigator as any).mediaSession.setActionHandler('previoustrack', () => controller.previous());

  return { updateMetadata };
};

export const openMiniController = async (
  controller: Controller,
  getPaused: () => boolean,
) => {
  const dpip = (window as any).documentPictureInPicture;
  if (!dpip?.requestWindow) return;

  const pipWindow: Window = await dpip.requestWindow({ width: 200, height: 100 });
  const doc = pipWindow.document;
  doc.body.style.margin = '0';
  doc.body.style.display = 'flex';
  doc.body.style.alignItems = 'center';
  doc.body.style.justifyContent = 'center';
  doc.body.style.gap = '8px';
  doc.body.style.background = '#121212';
  doc.body.style.color = '#fff';
  doc.body.style.fontFamily = 'sans-serif';

  const playBtn = doc.createElement('button');
  const nextBtn = doc.createElement('button');
  playBtn.textContent = getPaused() ? 'Play' : 'Pause';
  nextBtn.textContent = 'Next';

  const update = () => {
    playBtn.textContent = getPaused() ? 'Play' : 'Pause';
  };

  playBtn.onclick = () => controller.togglePlay();
  nextBtn.onclick = () => controller.next();

  doc.body.appendChild(playBtn);
  doc.body.appendChild(nextBtn);

  controller.addListener?.('playback_update', update);
  pipWindow.addEventListener('pagehide', () => {
    controller.removeListener?.('playback_update', update);
  });
};

export default initMediaSession;
