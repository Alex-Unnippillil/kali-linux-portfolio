(function initContentScript(global) {
  if (!global || !global.document) return;

  const { document } = global;

  function getMedias() {
    return Array.from(document.querySelectorAll('video, audio'));
  }

  function propagate(message) {
    document.querySelectorAll('iframe').forEach((frame) => {
      try {
        frame.contentWindow?.postMessage(message, '*');
      } catch (e) {
        // ignore cross-origin access errors
      }
    });
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'status') {
      const list = getMedias().map((m) => ({
        src: m.currentSrc || m.src,
        playing: !m.paused,
      }));
      propagate({ type: 'status' });
      sendResponse(list);
    } else if (msg.type === 'play' || msg.type === 'pause') {
      getMedias().forEach((m) => {
        try {
          msg.type === 'play' ? m.play() : m.pause();
        } catch (e) {}
      });
      propagate({ type: msg.type });
    }
  });

  global.addEventListener('message', (ev) => {
    const data = ev.data;
    if (!data || !data.type) return;
    if (data.type === 'play' || data.type === 'pause') {
      getMedias().forEach((m) => {
        try {
          data.type === 'play' ? m.play() : m.pause();
        } catch (e) {}
      });
      propagate({ type: data.type });
    } else if (data.type === 'status') {
      const list = getMedias().map((m) => ({
        src: m.currentSrc || m.src,
        playing: !m.paused,
      }));
      const { source } = ev;
      if (source && typeof source.postMessage === 'function') {
        source.postMessage({ type: 'statusResponse', list }, '*');
      }
    }
  });
})(typeof globalThis !== 'undefined' ? globalThis : undefined);
