export const LIVE_REGION_EVENT = 'kali-live-region-announce';

export const announceLiveRegion = (message: string): void => {
  if (typeof window === 'undefined' || !message) return;
  window.dispatchEvent(new CustomEvent<string>(LIVE_REGION_EVENT, { detail: message }));
};
