(function () {
  try {
    const enabled = document.documentElement.dataset.sw === 'true';
    if (!enabled || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        window.manualRefresh = () => registration.update();
      })
      .catch((err) => {
        console.error('Service worker registration failed', err);
      });
  } catch (err) {
    console.error('Service worker setup failed', err);
  }
})();

