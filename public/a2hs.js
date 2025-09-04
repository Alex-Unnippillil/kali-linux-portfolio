/* eslint-env browser */
/* eslint-disable no-top-level-window/no-top-level-window-or-document */
window.initA2HS ||= function () {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredA2HS = e;
    window.dispatchEvent(new Event('a2hs:available'));
  });
};

window.showA2HS ||= async function () {
  const evt = window.deferredA2HS;
  if (!evt) return false;
  window.deferredA2HS = null;
  await evt.prompt();
  await evt.userChoice;
  return true;
};
