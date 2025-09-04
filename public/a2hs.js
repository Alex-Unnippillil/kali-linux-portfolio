/* eslint-env browser */
/* eslint-disable no-top-level-window/no-top-level-window-or-document */
window.initA2HS ||= function () {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    const deferred = e;
    // trigger deferred.prompt() from your UI when ready
  });
};
