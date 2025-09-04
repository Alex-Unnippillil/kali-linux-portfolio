const omnibox =
  typeof document !== 'undefined'
    ? document.getElementById('omnibox')
    : null;
const playBtn =
  typeof document !== 'undefined' ? document.getElementById('play') : null;
const pauseBtn =
  typeof document !== 'undefined' ? document.getElementById('pause') : null;

function refresh() {
  chrome.runtime.sendMessage({ type: 'query' }, (response) => {
    if (!Array.isArray(response) || !playBtn || !pauseBtn) return;
    const anyPlaying = response.some((tab) =>
      tab.medias.some((m) => m.playing),
    );
    playBtn.disabled = anyPlaying;
    pauseBtn.disabled = !anyPlaying;
  });
}

playBtn?.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'control', action: 'play' });
});

pauseBtn?.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'control', action: 'pause' });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'refresh') {
    refresh();
  }
});

refresh();
