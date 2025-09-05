export function announce(message: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('announce', { detail: message }));
}
