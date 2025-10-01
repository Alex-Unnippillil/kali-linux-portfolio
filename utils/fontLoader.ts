const STORAGE_KEY = 'kali-font-loader:v1';

type FontGroupKey = 'cjk' | 'rtl';

type FontGroup = {
  key: FontGroupKey;
  regex: RegExp;
  href: string;
  preloadHosts?: string[];
};

const FONT_GROUPS: FontGroup[] = [
  {
    key: 'cjk',
    regex: /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\u{20000}-\u{2cea1}\u{f900}-\u{faff}]/u,
    href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap',
    preloadHosts: ['https://fonts.gstatic.com'],
  },
  {
    key: 'rtl',
    regex: /[\u0590-\u05ff\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u,
    href: 'https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;700&display=swap',
    preloadHosts: ['https://fonts.gstatic.com'],
  },
];

const memoryLoaded = new Set<FontGroupKey>();

const getPersisted = (): Set<FontGroupKey> => {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return new Set();
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored) as FontGroupKey[];
    return new Set(parsed);
  } catch (error) {
    console.warn('Font loader cache read failed', error);
    return new Set();
  }
};

const persistLoaded = () => {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(memoryLoaded)));
  } catch (error) {
    console.warn('Font loader cache write failed', error);
  }
};

const ensurePreconnect = (url: string) => {
  if (typeof document === 'undefined') return;
  const existing = document.head?.querySelector(`link[rel="preconnect"][href="${url}"]`);
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = url;
  link.crossOrigin = 'anonymous';
  document.head?.appendChild(link);
};

const injectStylesheet = (group: FontGroup) => {
  if (typeof document === 'undefined') return;
  const stylesheetId = `font-loader-${group.key}`;
  if (document.getElementById(stylesheetId)) {
    return;
  }

  group.preloadHosts?.forEach((host) => ensurePreconnect(host));

  const link = document.createElement('link');
  link.id = stylesheetId;
  link.rel = 'stylesheet';
  link.href = group.href;
  link.media = 'print';
  link.onload = () => {
    link.media = 'all';
  };
  document.head?.appendChild(link);
};

export const detectFontGroups = (text: string): FontGroupKey[] => {
  if (!text) return [];

  const matches: FontGroupKey[] = [];
  for (const group of FONT_GROUPS) {
    if (group.regex.test(text)) {
      matches.push(group.key);
    }
  }
  return matches;
};

const maybeLoadGroups = (keys: FontGroupKey[]) => {
  if (typeof document === 'undefined') return;

  let didPersist = false;

  keys.forEach((key) => {
    if (memoryLoaded.has(key)) return;

    const group = FONT_GROUPS.find((candidate) => candidate.key === key);
    if (!group) return;

    memoryLoaded.add(key);
    injectStylesheet(group);
    didPersist = true;
  });

  if (didPersist) {
    persistLoaded();
  }
};

const extractText = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    return (node as Element).textContent ?? '';
  }

  return '';
};

export const initFontLoader = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const persisted = getPersisted();
  if (persisted.size) {
    maybeLoadGroups(Array.from(persisted));
  }

  const scheduleLoad = (() => {
    let buffer = '';
    let rafId: number | null = null;

    const flush = () => {
      const text = buffer;
      buffer = '';
      rafId = null;
      if (text) {
        const detected = detectFontGroups(text);
        if (detected.length) {
          maybeLoadGroups(detected);
        }
      }
    };

    return (text: string) => {
      if (!text) return;
      buffer += text;
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(flush);
    };
  })();

  const initialText = document.body?.innerText ?? '';
  if (initialText) {
    scheduleLoad(initialText);
  }

  if (!('MutationObserver' in window) || !document.body) {
    return;
  }

  const observer = new MutationObserver((mutations) => {
    let aggregated = '';
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        aggregated += (mutation.target?.textContent ?? '') as string;
      }
      mutation.addedNodes.forEach((node) => {
        aggregated += extractText(node);
      });
    }

    if (aggregated) {
      scheduleLoad(aggregated);
    }
  });

  observer.observe(document.body, {
    characterData: true,
    childList: true,
    subtree: true,
  });

  window.addEventListener('languagechange', () => {
    const text = document.body?.innerText ?? '';
    if (text) {
      scheduleLoad(text);
    }
  });
};

export const __FONT_GROUPS__ = FONT_GROUPS;
