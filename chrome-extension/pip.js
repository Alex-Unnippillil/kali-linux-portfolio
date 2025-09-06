import { isBrowser } from '@/utils/env';
const omnibox = (() => {
  if (isBrowser()) {
    return document.getElementById('omnibox');
  }
  return null;
})();
const playBtn = (() => {
  if (isBrowser()) {
    return document.getElementById('play');
  }
  return null;
})();
const pauseBtn = (() => {
  if (isBrowser()) {
    return document.getElementById('pause');
  }
  return null;
})();

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
