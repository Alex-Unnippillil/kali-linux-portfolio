(function () {
  function loadLocaleFonts(doc) {
    try {
      if (!doc) return;
      var lang = (doc.documentElement.lang || (typeof navigator !== 'undefined' && navigator.language) || 'en').toLowerCase();
      var prefix = lang.split('-')[0];
      var map = {
        zh: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap',
        ja: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap',
        ko: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap',
        ar: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&display=swap',
        hi: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&display=swap',
        bn: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;700&display=swap',
        th: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;700&display=swap'
      };
      var href = map[prefix];
      if (href && !doc.querySelector('link[data-locale-font]')) {
        var link = doc.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.setAttribute('data-locale-font', prefix);
        doc.head.appendChild(link);
      }
    } catch (e) {
      console.error('Failed to load locale fonts', e);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadLocaleFonts };
  } else {
    loadLocaleFonts(globalThis.document);
    // expose for debugging
    globalThis.loadLocaleFonts = loadLocaleFonts;
  }
})();
