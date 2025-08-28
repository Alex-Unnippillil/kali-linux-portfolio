export const updateDockBadge = (appId: string, delta = 1) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('dockbadge', { detail: { appId, delta } }));
};

export const clearDockBadge = (appId: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('dockbadge', { detail: { appId, clear: true } }));
};
