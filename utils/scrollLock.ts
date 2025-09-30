let lockCount = 0;
let originalOverflow: string | null = null;
let originalPaddingRight: string | null = null;

const getWindow = (): (Window & typeof globalThis) | null => {
  if (typeof globalThis === 'undefined') {
    return null;
  }

  return 'document' in globalThis
    ? (globalThis as Window & typeof globalThis)
    : null;
};

const getDocument = (): Document | null => {
  const win = getWindow();
  return win?.document ?? null;
};

const getBody = (): HTMLBodyElement | null => {
  const doc = getDocument();
  return doc?.body ?? null;
};

const getScrollbarWidth = (): number => {
  const win = getWindow();
  const doc = getDocument();
  if (!win || !doc) return 0;
  return Math.max(0, win.innerWidth - doc.documentElement.clientWidth);
};

const applyLock = () => {
  const body = getBody();
  const win = getWindow();
  if (!body || !win) return;

  if (lockCount === 0) {
    originalOverflow = body.style.overflow;
    originalPaddingRight = body.style.paddingRight;

    const scrollbarWidth = getScrollbarWidth();
    if (scrollbarWidth > 0) {
      const computedPadding = parseFloat(win.getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${computedPadding + scrollbarWidth}px`;
    }

    body.style.overflow = 'hidden';
  }

  lockCount += 1;
};

const releaseLock = () => {
  if (lockCount === 0) return;

  lockCount -= 1;

  if (lockCount > 0) return;

  const body = getBody();
  if (!body) return;

  body.style.overflow = originalOverflow ?? '';
  body.style.paddingRight = originalPaddingRight ?? '';

  originalOverflow = null;
  originalPaddingRight = null;
};

export const lockScroll = () => {
  applyLock();
};

export const unlockScroll = () => {
  releaseLock();
};

export const toggleScrollLock = (shouldLock: boolean) => {
  if (shouldLock) {
    lockScroll();
  } else {
    unlockScroll();
  }
};
