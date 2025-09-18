const OVERLAY_ID = 'klp-reader-overlay';
const TOAST_ID = 'klp-reader-toast';
const STYLE_ID = 'klp-reader-style';
const TOAST_VISIBLE_CLASS = 'klp-visible';
const DEFAULT_SETTINGS = {
  fontSize: 18,
  lineHeight: 1.6,
  columnWidth: 60,
  fontFamily: 'serif',
  theme: 'light',
};
const FONT_STACKS = {
  serif: `'Merriweather', 'Georgia', serif`,
  sans: `'Inter', 'Helvetica Neue', Arial, sans-serif`,
  mono: `'Fira Mono', 'Courier New', monospace`,
};
const THEMES = ['light', 'dark', 'sepia'];
const FONT_OPTIONS = ['serif', 'sans', 'mono'];
const BAD_TAG_PATTERNS = /(comment|footer|footnote|sidebar|widget|share|advert|promo|related)/i;

let overlayEl = null;
let previousOverflow = null;
let toastHideTimer = null;
let toastRemoveTimer = null;
let currentSettings = { ...DEFAULT_SETTINGS };

ensureBaseStyle();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'toggle-reader') return;
  toggleReader().then(sendResponse);
  return true;
});

async function toggleReader() {
  if (overlayEl) {
    deactivateReader();
    return { status: 'hidden' };
  }

  if (document.contentType && !/html/i.test(document.contentType)) {
    showUnsupported('Reader mode is not available for this content.');
    return { status: 'unsupported' };
  }

  if (!document.body) {
    showUnsupported('Reader mode is not available on this page.');
    return { status: 'unsupported' };
  }

  const article = extractArticle();
  if (!article) {
    showUnsupported('Reader mode is not available on this page.');
    return { status: 'unsupported' };
  }

  currentSettings = await loadSettings();
  activateReader(article);
  return { status: 'shown', title: article.title };
}

function activateReader(article) {
  const overlay = createOverlay(article);
  overlayEl = overlay;
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  document.body.appendChild(overlay);
  applySettings();
}

function deactivateReader() {
  if (!overlayEl) return;
  overlayEl.remove();
  overlayEl = null;
  if (previousOverflow !== null) {
    document.body.style.overflow = previousOverflow;
  }
  previousOverflow = null;
  document.removeEventListener('keydown', handleKeydown, true);
}

function createOverlay(article) {
  ensureBaseStyle();
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Reader mode');

  const panel = document.createElement('div');
  panel.className = 'klp-reader-panel';
  panel.tabIndex = -1;

  const excerptHtml = article.excerpt
    ? `<p class='klp-reader-excerpt'>${escapeHtml(article.excerpt)}</p>`
    : '';

  panel.innerHTML = `
    <header class='klp-reader-header'>
      <button type='button' class='klp-reader-close' aria-label='Exit reader mode'>×</button>
      <div class='klp-reader-heading'>
        <h1 class='klp-reader-title'>${escapeHtml(article.title)}</h1>
        ${excerptHtml}
      </div>
    </header>
    <section class='klp-reader-controls' role='group' aria-label='Reader settings'>
      <div class='klp-control'>
        <span class='klp-control-label'>Text size</span>
        <div class='klp-stepper'>
          <button type='button' data-action='decrease-font' aria-label='Decrease text size'>A−</button>
          <span class='klp-value klp-font-size-value'></span>
          <button type='button' data-action='increase-font' aria-label='Increase text size'>A+</button>
        </div>
      </div>
      <label class='klp-control'>
        <span class='klp-control-label'>Font</span>
        <select data-control='font-family'>
          <option value='serif'>Serif</option>
          <option value='sans'>Sans-serif</option>
          <option value='mono'>Monospace</option>
        </select>
      </label>
      <label class='klp-control'>
        <span class='klp-control-label'>Theme</span>
        <select data-control='theme'>
          <option value='light'>Light</option>
          <option value='dark'>Dark</option>
          <option value='sepia'>Sepia</option>
        </select>
      </label>
      <label class='klp-control'>
        <span class='klp-control-label'>Width <span class='klp-value' data-display='width'></span></span>
        <input type='range' min='45' max='90' step='5' data-control='width' />
      </label>
      <label class='klp-control'>
        <span class='klp-control-label'>Line height <span class='klp-value' data-display='line'></span></span>
        <input type='range' min='1.2' max='2' step='0.1' data-control='line-height' />
      </label>
    </section>
    <div class='klp-reader-body'>
      <article class='klp-reader-content'>${article.content}</article>
    </div>
  `;

  overlay.appendChild(panel);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      deactivateReader();
    }
  });

  const closeButton = panel.querySelector('.klp-reader-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => deactivateReader());
  }

  const decreaseBtn = panel.querySelector('[data-action=\'decrease-font\']');
  const increaseBtn = panel.querySelector('[data-action=\'increase-font\']');

  if (decreaseBtn) {
    decreaseBtn.addEventListener('click', () => adjustFontSize(-2));
  }

  if (increaseBtn) {
    increaseBtn.addEventListener('click', () => adjustFontSize(2));
  }

  const fontSelect = panel.querySelector('select[data-control=\'font-family\']');
  if (fontSelect) {
    fontSelect.addEventListener('change', (event) => {
      const value = event.target.value;
      if (FONT_OPTIONS.includes(value)) {
        currentSettings.fontFamily = value;
        applySettings();
        saveSettings(currentSettings);
      }
    });
  }

  const themeSelect = panel.querySelector('select[data-control=\'theme\']');
  if (themeSelect) {
    themeSelect.addEventListener('change', (event) => {
      const value = event.target.value;
      if (THEMES.includes(value)) {
        currentSettings.theme = value;
        applySettings();
        saveSettings(currentSettings);
      }
    });
  }

  const widthRange = panel.querySelector('input[data-control=\'width\']');
  if (widthRange) {
    widthRange.addEventListener('input', (event) => {
      const value = Number.parseInt(event.target.value, 10);
      if (!Number.isNaN(value)) {
        currentSettings.columnWidth = clamp(value, 45, 90);
        applySettings();
      }
    });
    widthRange.addEventListener('change', () => saveSettings(currentSettings));
  }

  const lineRange = panel.querySelector('input[data-control=\'line-height\']');
  if (lineRange) {
    lineRange.addEventListener('input', (event) => {
      const value = Number.parseFloat(event.target.value);
      if (!Number.isNaN(value)) {
        currentSettings.lineHeight = clamp(value, 1.2, 2);
        applySettings();
      }
    });
    lineRange.addEventListener('change', () => saveSettings(currentSettings));
  }

  document.addEventListener('keydown', handleKeydown, true);

  requestAnimationFrame(() => {
    panel.focus();
  });

  return overlay;
}

function handleKeydown(event) {
  if (event.key === 'Escape' && overlayEl) {
    event.preventDefault();
    deactivateReader();
  }
}

function adjustFontSize(delta) {
  const next = clamp(currentSettings.fontSize + delta, 14, 28);
  if (next === currentSettings.fontSize) return;
  currentSettings.fontSize = next;
  applySettings();
  saveSettings(currentSettings);
}

function applySettings() {
  if (!overlayEl) return;
  overlayEl.style.setProperty('--reader-font-size', `${currentSettings.fontSize}px`);
  overlayEl.style.setProperty('--reader-line-height', `${currentSettings.lineHeight}`);
  overlayEl.style.setProperty('--reader-font-family', FONT_STACKS[currentSettings.fontFamily] || FONT_STACKS.serif);
  overlayEl.style.setProperty('--reader-max-width', `${currentSettings.columnWidth}ch`);
  overlayEl.classList.remove('klp-theme-light', 'klp-theme-dark', 'klp-theme-sepia');
  overlayEl.classList.add(`klp-theme-${currentSettings.theme}`);

  const fontSizeValue = overlayEl.querySelector('.klp-font-size-value');
  if (fontSizeValue) {
    fontSizeValue.textContent = `${currentSettings.fontSize}px`;
  }

  const fontSelect = overlayEl.querySelector('select[data-control=\'font-family\']');
  if (fontSelect) {
    fontSelect.value = currentSettings.fontFamily;
  }

  const themeSelect = overlayEl.querySelector('select[data-control=\'theme\']');
  if (themeSelect) {
    themeSelect.value = currentSettings.theme;
  }

  const widthRange = overlayEl.querySelector('input[data-control=\'width\']');
  if (widthRange) {
    widthRange.value = String(currentSettings.columnWidth);
  }

  const widthDisplay = overlayEl.querySelector('[data-display=\'width\']');
  if (widthDisplay) {
    widthDisplay.textContent = `${currentSettings.columnWidth}ch`;
  }

  const lineRange = overlayEl.querySelector('input[data-control=\'line-height\']');
  if (lineRange) {
    lineRange.value = currentSettings.lineHeight.toFixed(1);
  }

  const lineDisplay = overlayEl.querySelector('[data-display=\'line\']');
  if (lineDisplay) {
    lineDisplay.textContent = currentSettings.lineHeight.toFixed(1);
  }
}

function ensureBaseStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${OVERLAY_ID} {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      z-index: 2147483647;
      display: flex;
      justify-content: center;
      padding: clamp(1rem, 4vw, 3rem);
      overflow-y: auto;
      box-sizing: border-box;
      transition: opacity 0.2s ease;
      opacity: 1;
    }
    #${OVERLAY_ID} .klp-reader-panel {
      background: var(--reader-background, #fdfcf8);
      color: var(--reader-foreground, #1f2933);
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.35);
      border-radius: 20px;
      padding: clamp(1.5rem, 3vw, 3rem);
      width: min(100%, 1100px);
      display: flex;
      flex-direction: column;
      gap: clamp(1rem, 2.5vw, 1.75rem);
      max-height: none;
    }
    #${OVERLAY_ID} .klp-reader-header {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      justify-content: space-between;
    }
    #${OVERLAY_ID} .klp-reader-heading {
      flex: 1 1 auto;
      min-width: 0;
    }
    #${OVERLAY_ID} .klp-reader-title {
      font-size: clamp(1.5rem, 3vw, 2.4rem);
      line-height: 1.2;
      margin: 0;
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      color: var(--reader-foreground, #1f2933);
    }
    #${OVERLAY_ID} .klp-reader-excerpt {
      margin: 0.5rem 0 0;
      color: var(--reader-muted, #475569);
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
    }
    #${OVERLAY_ID} .klp-reader-close {
      background: transparent;
      border: none;
      color: var(--reader-foreground, #1f2933);
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 0.75rem;
      transition: background 0.2s ease;
    }
    #${OVERLAY_ID} .klp-reader-close:hover,
    #${OVERLAY_ID} .klp-reader-close:focus-visible {
      background: rgba(148, 163, 184, 0.2);
      outline: none;
    }
    #${OVERLAY_ID} .klp-reader-controls {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: clamp(0.75rem, 2vw, 1.5rem);
    }
    #${OVERLAY_ID} .klp-control {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      color: var(--reader-foreground, #1f2933);
    }
    #${OVERLAY_ID} .klp-control-label {
      font-size: 0.9rem;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.25rem;
    }
    #${OVERLAY_ID} .klp-stepper {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.15);
      overflow: hidden;
    }
    #${OVERLAY_ID} .klp-stepper button {
      background: transparent;
      border: none;
      padding: 0.3rem 0.75rem;
      font-size: 0.9rem;
      cursor: pointer;
      color: inherit;
      transition: background 0.2s ease;
    }
    #${OVERLAY_ID} .klp-stepper button:hover,
    #${OVERLAY_ID} .klp-stepper button:focus-visible {
      background: rgba(148, 163, 184, 0.25);
      outline: none;
    }
    #${OVERLAY_ID} .klp-value {
      font-size: 0.9rem;
    }
    #${OVERLAY_ID} select,
    #${OVERLAY_ID} input[type='range'] {
      width: 100%;
      font: inherit;
      padding: 0.45rem 0.6rem;
      border-radius: 0.75rem;
      border: 1px solid rgba(148, 163, 184, 0.4);
      background: rgba(255, 255, 255, 0.85);
      color: inherit;
      box-sizing: border-box;
    }
    #${OVERLAY_ID} input[type='range'] {
      padding: 0;
      height: 2.25rem;
      background: transparent;
    }
    #${OVERLAY_ID} .klp-reader-body {
      display: flex;
      justify-content: center;
    }
    #${OVERLAY_ID} .klp-reader-content {
      font-size: var(--reader-font-size, 18px);
      line-height: var(--reader-line-height, 1.6);
      font-family: var(--reader-font-family, 'Georgia', serif);
      max-width: var(--reader-max-width, 60ch);
      width: 100%;
      color: var(--reader-foreground, #1f2933);
    }
    #${OVERLAY_ID} .klp-reader-content > *:first-child {
      margin-top: 0;
    }
    #${OVERLAY_ID} .klp-reader-content p {
      margin: 0 0 1.25rem;
    }
    #${OVERLAY_ID} .klp-reader-content h1,
    #${OVERLAY_ID} .klp-reader-content h2,
    #${OVERLAY_ID} .klp-reader-content h3,
    #${OVERLAY_ID} .klp-reader-content h4,
    #${OVERLAY_ID} .klp-reader-content h5,
    #${OVERLAY_ID} .klp-reader-content h6 {
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      margin: 2.5rem 0 1.2rem;
      line-height: 1.25;
    }
    #${OVERLAY_ID} .klp-reader-content h1 { font-size: 2.2rem; }
    #${OVERLAY_ID} .klp-reader-content h2 { font-size: 1.8rem; }
    #${OVERLAY_ID} .klp-reader-content h3 { font-size: 1.5rem; }
    #${OVERLAY_ID} .klp-reader-content a {
      color: var(--reader-link, #0369a1);
      text-decoration: underline;
      text-decoration-thickness: 0.12em;
    }
    #${OVERLAY_ID} .klp-reader-content blockquote {
      margin: 1.5rem 0;
      padding: 1rem 1.5rem;
      border-inline-start: 4px solid var(--reader-link, #0369a1);
      background: var(--reader-quote, rgba(148, 163, 184, 0.18));
      border-radius: 0.75rem;
      font-style: italic;
    }
    #${OVERLAY_ID} .klp-reader-content code,
    #${OVERLAY_ID} .klp-reader-content pre {
      font-family: 'Fira Code', 'Fira Mono', 'Courier New', monospace;
      background: rgba(148, 163, 184, 0.2);
      padding: 0.2rem 0.35rem;
      border-radius: 0.5rem;
    }
    #${OVERLAY_ID} .klp-reader-content pre {
      padding: 1rem;
      overflow-x: auto;
    }
    #${OVERLAY_ID} .klp-reader-content ul,
    #${OVERLAY_ID} .klp-reader-content ol {
      padding-inline-start: 1.5rem;
      margin: 0 0 1.5rem;
    }
    #${OVERLAY_ID} .klp-reader-content img,
    #${OVERLAY_ID} .klp-reader-content picture,
    #${OVERLAY_ID} .klp-reader-content figure {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1.5rem auto;
    }
    #${OVERLAY_ID} .klp-reader-content figcaption {
      text-align: center;
      color: var(--reader-muted, #475569);
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }
    #${OVERLAY_ID} .klp-reader-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      overflow: auto;
      display: block;
    }
    #${OVERLAY_ID} .klp-reader-content th,
    #${OVERLAY_ID} .klp-reader-content td {
      border: 1px solid rgba(148, 163, 184, 0.4);
      padding: 0.6rem 0.75rem;
      text-align: left;
    }
    #${OVERLAY_ID} .klp-reader-content hr {
      border: none;
      border-top: 1px solid rgba(148, 163, 184, 0.4);
      margin: 2rem 0;
    }
    #${OVERLAY_ID}.klp-theme-light {
      --reader-background: #fdfcf8;
      --reader-foreground: #1f2933;
      --reader-muted: #475569;
      --reader-link: #0369a1;
      --reader-quote: rgba(148, 163, 184, 0.18);
    }
    #${OVERLAY_ID}.klp-theme-dark {
      --reader-background: #0f172a;
      --reader-foreground: #f8fafc;
      --reader-muted: #cbd5f5;
      --reader-link: #38bdf8;
      --reader-quote: rgba(148, 163, 184, 0.15);
    }
    #${OVERLAY_ID}.klp-theme-dark select,
    #${OVERLAY_ID}.klp-theme-dark input[type='range'] {
      background: rgba(15, 23, 42, 0.6);
      border-color: rgba(148, 163, 184, 0.5);
    }
    #${OVERLAY_ID}.klp-theme-dark .klp-reader-close:hover,
    #${OVERLAY_ID}.klp-theme-dark .klp-reader-close:focus-visible {
      background: rgba(148, 163, 184, 0.25);
    }
    #${OVERLAY_ID}.klp-theme-sepia {
      --reader-background: #f7f0e0;
      --reader-foreground: #443322;
      --reader-muted: #6b5135;
      --reader-link: #b45309;
      --reader-quote: rgba(250, 204, 21, 0.25);
    }
    #${OVERLAY_ID}.klp-theme-sepia select,
    #${OVERLAY_ID}.klp-theme-sepia input[type='range'] {
      background: rgba(255, 255, 255, 0.6);
      border-color: rgba(120, 89, 60, 0.35);
    }
    #${TOAST_ID} {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.95);
      color: #f8fafc;
      padding: 0.75rem 1.4rem;
      border-radius: 999px;
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      font-size: 0.9rem;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.35);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
      z-index: 2147483647;
    }
    #${TOAST_ID}.${TOAST_VISIBLE_CLASS} {
      opacity: 1;
    }
    @media (max-width: 768px) {
      #${OVERLAY_ID} {
        padding: 1rem;
      }
      #${OVERLAY_ID} .klp-reader-panel {
        border-radius: 12px;
        padding: 1.25rem;
      }
      #${OVERLAY_ID} .klp-reader-controls {
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      }
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

function showUnsupported(message) {
  if (!document.body) return;
  ensureBaseStyle();
  let toast = document.getElementById(TOAST_ID);
  if (!toast) {
    toast = document.createElement('div');
    toast.id = TOAST_ID;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add(TOAST_VISIBLE_CLASS);
  if (toastHideTimer) {
    clearTimeout(toastHideTimer);
  }
  if (toastRemoveTimer) {
    clearTimeout(toastRemoveTimer);
  }
  toastHideTimer = setTimeout(() => {
    toast.classList.remove(TOAST_VISIBLE_CLASS);
    toastHideTimer = null;
    toastRemoveTimer = setTimeout(() => {
      toast?.remove();
      toastRemoveTimer = null;
    }, 300);
  }, 2400);
}

function loadSettings() {
  return new Promise((resolve) => {
    if (!chrome.storage || !chrome.storage.local) {
      resolve({ ...DEFAULT_SETTINGS });
      return;
    }
    chrome.storage.local.get('readerSettings', (data) => {
      if (chrome.runtime && chrome.runtime.lastError) {
        resolve({ ...DEFAULT_SETTINGS });
        return;
      }
      resolve(normalizeSettings(data.readerSettings));
    });
  });
}

function saveSettings(settings) {
  if (!chrome.storage || !chrome.storage.local) return;
  chrome.storage.local.set({ readerSettings: settings });
}

function normalizeSettings(stored) {
  const next = { ...DEFAULT_SETTINGS };
  if (!stored || typeof stored !== 'object') return next;
  if (typeof stored.fontSize === 'number') {
    next.fontSize = clamp(stored.fontSize, 14, 28);
  }
  if (typeof stored.lineHeight === 'number') {
    next.lineHeight = clamp(Number.parseFloat(stored.lineHeight), 1.2, 2);
  }
  if (typeof stored.columnWidth === 'number') {
    next.columnWidth = clamp(stored.columnWidth, 45, 90);
  }
  if (typeof stored.fontFamily === 'string' && FONT_OPTIONS.includes(stored.fontFamily)) {
    next.fontFamily = stored.fontFamily;
  }
  if (typeof stored.theme === 'string' && THEMES.includes(stored.theme)) {
    next.theme = stored.theme;
  }
  return next;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  const str = value == null ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractArticle() {
  try {
    const candidates = collectCandidates();
    let best = null;
    let bestScore = 0;
    candidates.forEach((el) => {
      const textLength = (el.textContent || '').replace(/\s+/g, ' ').trim().length;
      if (textLength < 200) return;
      const linkDensity = computeLinkDensity(el);
      const paragraphCount = el.querySelectorAll('p').length;
      const headingCount = el.querySelectorAll('h1, h2, h3').length;
      let score = textLength * (1 - linkDensity) + paragraphCount * 80 + headingCount * 20;
      if (el.matches('article, main, [role="main"]')) {
        score *= 1.1;
      }
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    });

    if (!best) return null;

    const sanitized = sanitizeContent(best);
    if (!sanitized) return null;
    if (sanitized.text.length < 200 && sanitized.paragraphs < 3) return null;

    const heading = best.querySelector('h1, h2, h3');
    const pageHeading = heading ? heading.textContent : document.querySelector('h1')?.textContent;
    const title = (pageHeading || document.title || 'Reader view').trim();
    const cleanText = sanitized.text.replace(/\s+/g, ' ').trim();
    const excerpt = cleanText.length > 280 ? `${cleanText.slice(0, 280).trim()}…` : cleanText;

    return {
      title,
      excerpt,
      content: sanitized.html,
    };
  } catch (error) {
    return null;
  }
}

function collectCandidates() {
  const set = new Set();
  const selectors = [
    'article',
    'main',
    '[role="main"]',
    'section',
    '.article',
    '.post',
    '.story',
    '.content',
    '.entry-content',
  ];
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      if (isReadableElement(el)) set.add(el);
    });
  });

  document.querySelectorAll('p').forEach((p) => {
    const text = (p.textContent || '').trim();
    if (text.length < 80) return;
    let parent = p.parentElement;
    while (parent && parent !== document.body) {
      if (isReadableElement(parent)) {
        set.add(parent);
        break;
      }
      parent = parent.parentElement;
    }
  });

  return Array.from(set);
}

function isReadableElement(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  if (['nav', 'aside', 'footer', 'header', 'form', 'button', 'figure', 'svg', 'canvas'].includes(tag)) {
    return false;
  }
  if (BAD_TAG_PATTERNS.test(`${el.className} ${el.id}`)) return false;
  return isVisible(el);
}

function isVisible(el) {
  if (!(el instanceof Element)) return false;
  const style = window.getComputedStyle(el);
  if (!style || style.display === 'none' || style.visibility === 'hidden' || Number.parseFloat(style.opacity) === 0) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function computeLinkDensity(el) {
  const textLength = (el.textContent || '').trim().length;
  if (!textLength) return 0;
  let linkText = 0;
  el.querySelectorAll('a').forEach((a) => {
    linkText += (a.textContent || '').trim().length;
  });
  return Math.min(linkText / textLength, 1);
}

function sanitizeContent(element) {
  const clone = element.cloneNode(true);
  const container = document.createElement('div');
  container.appendChild(clone);

  container.querySelectorAll('script, style, noscript, canvas, svg, form, button, input, textarea, select, iframe, object, embed, header, footer, nav, aside, video, audio, portal').forEach((node) =>
    node.remove()
  );

  const allowedTags = new Set([
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'code',
    'pre',
    'ul',
    'ol',
    'li',
    'strong',
    'em',
    'b',
    'i',
    'u',
    'span',
    'div',
    'section',
    'article',
    'figure',
    'figcaption',
    'img',
    'picture',
    'source',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'td',
    'th',
    'dl',
    'dt',
    'dd',
    'sup',
    'sub',
    'small',
    'mark',
    'time',
    'hr',
    'br',
    'a',
    'caption',
    'cite',
    'q',
    'kbd',
  ]);

  const attributeMap = {
    a: new Set(['href', 'title']),
    img: new Set(['src', 'alt', 'title', 'width', 'height', 'loading']),
    picture: new Set([]),
    source: new Set(['src', 'srcset', 'type', 'media']),
    td: new Set(['headers', 'colspan', 'rowspan']),
    th: new Set(['headers', 'colspan', 'rowspan', 'scope']),
    time: new Set(['datetime']),
  };

  function clean(node) {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child;
        const tag = el.tagName.toLowerCase();
        if (!allowedTags.has(tag)) {
          if (el.parentNode) {
            while (el.firstChild) {
              el.parentNode.insertBefore(el.firstChild, el);
            }
            el.remove();
          }
          return;
        }
        Array.from(el.attributes).forEach((attr) => {
          const name = attr.name.toLowerCase();
          const value = attr.value;
          const allowedAttr =
            (attributeMap[tag] && attributeMap[tag].has(name)) ||
            ['alt', 'title'].includes(name) ||
            name.startsWith('data-') ||
            name.startsWith('aria-');
          if (!allowedAttr) {
            el.removeAttribute(attr.name);
            return;
          }
          if (name === 'href' || name === 'src') {
            if (/^javascript:/i.test(value)) {
              el.removeAttribute(attr.name);
              return;
            }
            const resolved = resolveUrl(value);
            if (resolved) {
              el.setAttribute(attr.name, resolved);
            } else {
              el.removeAttribute(attr.name);
            }
          }
          if (name === 'srcset') {
            const entries = value
              .split(',')
              .map((part) => part.trim())
              .filter(Boolean)
              .map((part) => {
                const [url, descriptor] = part.split(/\s+/, 2);
                const resolved = resolveUrl(url);
                if (!resolved) return null;
                return descriptor ? `${resolved} ${descriptor}` : resolved;
              })
              .filter(Boolean);
            if (entries.length) {
              el.setAttribute('srcset', entries.join(', '));
            } else {
              el.removeAttribute('srcset');
            }
          }
        });
        el.removeAttribute('style');
        el.removeAttribute('class');
        clean(el);
        if (['p', 'li', 'span', 'div'].includes(tag)) {
          const text = (el.textContent || '').trim();
          if (!text && !el.querySelector('img, picture, figure')) {
            el.remove();
          }
        }
      } else if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
      }
    });
  }

  clean(container);

  const textContent = (container.textContent || '').trim();
  const paragraphs = container.querySelectorAll('p').length;
  return {
    html: container.innerHTML,
    text: textContent,
    paragraphs,
  };
}

function resolveUrl(value) {
  try {
    return new URL(value, document.baseURI).href;
  } catch (error) {
    return null;
  }
}
