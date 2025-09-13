export const isMac = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

export const getMetaKeyLabel = () => (isMac() ? 'Meta' : 'Win');

export const isMetaKey = (e: KeyboardEvent) => e.metaKey;
