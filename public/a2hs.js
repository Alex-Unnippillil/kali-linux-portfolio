/* eslint-env browser */
window.initA2HS ||= function () {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    const deferred = e;
    // trigger deferred.prompt() from your UI when ready
  });
};
