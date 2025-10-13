(function initPopup() {
  if (typeof document === 'undefined') return;

  const omnibox = document.getElementById('omnibox');
  const playBtn = document.getElementById('play');
  const pauseBtn = document.getElementById('pause');

  if (!playBtn || !pauseBtn) {
    return;
  }

  function refresh() {
    chrome.runtime.sendMessage({ type: 'query' }, (response) => {
      if (!Array.isArray(response)) return;
      const anyPlaying = response.some((tab) =>
        tab.medias.some((m) => m.playing),
      );
      playBtn.disabled = anyPlaying;
      pauseBtn.disabled = !anyPlaying;
    });
  }

  playBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'control', action: 'play' });
  });

  pauseBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'control', action: 'pause' });
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'refresh') {
      refresh();
    }
  });

  refresh();
})();
