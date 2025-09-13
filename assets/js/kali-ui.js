(() => {
  const panel = document.querySelector('.kali-panel');
  if (!panel) return;
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > lastY) {
      panel.setAttribute('data-hidden', '');
    } else {
      panel.removeAttribute('data-hidden');
    }
    lastY = y;
  });
})();
