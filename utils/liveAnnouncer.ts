const ANNOUNCER_EVENT = 'app:announce';

type AnnounceDetail = {
  message: string;
};

export { ANNOUNCER_EVENT };

export function announce(message: string) {
  if (typeof window === 'undefined') return;
  const detail: AnnounceDetail = { message };
  window.dispatchEvent(new CustomEvent<AnnounceDetail>(ANNOUNCER_EVENT, { detail }));
}

export type { AnnounceDetail };
