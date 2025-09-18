const STATUS_TOAST_EVENT = 'status-toast';

function dispatchStatusToast(message) {
  if (typeof window === 'undefined' || !message) return;
  const detail = typeof message === 'string' ? { message } : message;
  try {
    window.dispatchEvent(new CustomEvent(STATUS_TOAST_EVENT, { detail }));
  } catch {
    // ignore environments without CustomEvent
  }
}

function subscribeStatusToast(handler) {
  if (typeof window === 'undefined' || typeof handler !== 'function') {
    return () => {};
  }
  const listener = (event) => {
    const detail = event?.detail;
    const message =
      typeof detail === 'string'
        ? detail
        : typeof detail?.message === 'string'
          ? detail.message
          : '';
    if (message) handler(message);
  };
  window.addEventListener(STATUS_TOAST_EVENT, listener);
  return () => window.removeEventListener(STATUS_TOAST_EVENT, listener);
}

module.exports = {
  STATUS_TOAST_EVENT,
  dispatchStatusToast,
  subscribeStatusToast,
};
