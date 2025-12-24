"use client";

import { isBrowser } from '../../utils/env';
import { getDb } from '../../utils/safeIDB';

let notesContainer = null;
let addNoteBtn = null;

function initDom() {
  if (!isBrowser) return;
  notesContainer = document.getElementById('notes');
  addNoteBtn = document.getElementById('add-note');
}

initDom();

const DEFAULT_NOTE_COLOR_TOKEN = '--sticky-note-surface';
const LEGACY_DEFAULT_COLOR = '#fffa65';
const LIGHT_INK_TOKEN = '--kali-terminal-text';
const DARK_INK_TOKEN = '--kali-bg-solid';

function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const sixDigit = trimmed.match(/^#([0-9a-f]{6})$/i);
  if (sixDigit) {
    return `#${sixDigit[1].toLowerCase()}`;
  }

  const short = trimmed.match(/^#([0-9a-f]{3})$/i);
  if (short) {
    return (
      '#' +
      short[1]
        .toLowerCase()
        .split('')
        .map((char) => char + char)
        .join('')
    );
  }

  const rgb = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)$/i,
  );
  if (rgb) {
    const components = rgb.slice(1, 4).map((valuePart) => {
      const parsed = Number.parseInt(valuePart, 10);
      if (Number.isNaN(parsed)) return 0;
      return Math.min(255, Math.max(0, parsed));
    });
    return (
      '#' +
      components
        .map((component) => component.toString(16).padStart(2, '0'))
        .join('')
    ).toLowerCase();
  }

  return null;
}

function toHexColor(value, fallback = LEGACY_DEFAULT_COLOR) {
  const fallbackHex = normalizeHex(fallback) ?? normalizeHex(LEGACY_DEFAULT_COLOR) ?? '#fffa65';
  const normalized = normalizeHex(value);
  return (normalized ?? fallbackHex).toLowerCase();
}

function getTokenColor(tokenName, fallback = LEGACY_DEFAULT_COLOR) {
  const fallbackHex = toHexColor(fallback);
  if (!isBrowser || !tokenName) {
    return fallbackHex;
  }
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(tokenName);
    if (!raw) {
      return fallbackHex;
    }
    return toHexColor(raw, fallbackHex);
  } catch (err) {
    console.warn(`Failed to read CSS token ${tokenName}`, err);
    return fallbackHex;
  }
}

function getDefaultNoteColor() {
  return getTokenColor(DEFAULT_NOTE_COLOR_TOKEN, LEGACY_DEFAULT_COLOR);
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  if ([r, g, b].some((component) => Number.isNaN(component))) return null;
  return { r, g, b };
}

function getRelativeLuminance({ r, g, b }) {
  const transform = (value) => {
    const ratio = value / 255;
    return ratio <= 0.03928 ? ratio / 12.92 : Math.pow((ratio + 0.055) / 1.055, 2.4);
  };
  const [rLin, gLin, bLin] = [r, g, b].map(transform);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

function getInkColorForBackground(hexColor) {
  const lightInk = getTokenColor(LIGHT_INK_TOKEN, '#f8fafc');
  const darkInk = getTokenColor(DARK_INK_TOKEN, '#0b121a');
  const rgb = hexToRgb(hexColor);
  if (!rgb) return lightInk;
  const luminance = getRelativeLuminance(rgb);
  return luminance > 0.6 ? darkInk : lightInk;
}

function normalizeNote(note) {
  if (!note) return false;
  let mutated = false;
  const fallbackColor = toHexColor(note.color);
  if (fallbackColor !== note.color) {
    note.color = fallbackColor;
    mutated = true;
  }
  if (!note.colorToken && fallbackColor === toHexColor(LEGACY_DEFAULT_COLOR)) {
    note.colorToken = DEFAULT_NOTE_COLOR_TOKEN;
    mutated = true;
  }
  const resolvedColor = note.colorToken
    ? getTokenColor(note.colorToken, fallbackColor)
    : fallbackColor;
  if (resolvedColor !== note.color) {
    note.color = resolvedColor;
    mutated = true;
  }
  return mutated;
}

function applyNoteColorToElement(note, el) {
  const resolvedColor = note.colorToken
    ? getTokenColor(note.colorToken, note.color)
    : toHexColor(note.color);
  note.color = resolvedColor;
  const inkColor = getInkColorForBackground(resolvedColor);
  if (el) {
    el.style.setProperty('--note-color', resolvedColor);
    el.style.setProperty('--note-ink', inkColor);
    el.style.backgroundColor = resolvedColor;
    el.style.color = inkColor;
    if (note.colorToken) {
      el.dataset.colorToken = note.colorToken;
    } else {
      delete el.dataset.colorToken;
    }
  }
  return { background: resolvedColor, ink: inkColor };
}

const DB_NAME = 'stickyNotes';
const STORE_NAME = 'notes';
const DB_VERSION = 1;

// Lazily open a connection to IndexedDB to avoid errors in environments
// where the API is unavailable (e.g. server-side rendering).
let dbPromise = null;
function getDB() {
  if (!dbPromise) {
    dbPromise = getDb(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
      blocked() {
        console.error('Sticky notes DB upgrade blocked');
      },
      blocking() {
        console.warn('Waiting for other tabs to close the Sticky notes DB');
      },
    });
  }
  return dbPromise;
}

let notes = [];

async function saveNotes() {
  try {
    const dbp = getDB();
    if (!dbp) return;
    const db = await dbp;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.store.clear();
    for (const note of notes) {
      normalizeNote(note);
      await tx.store.put(note);
    }
    await tx.done;
  } catch (err) {
    console.error('Failed to save notes', err);
  }
}

function createNoteElement(note) {
  if (!notesContainer) return;
  normalizeNote(note);
  const el = document.createElement('div');
  el.className = 'note';
  el.style.left = note.x + 'px';
  el.style.top = note.y + 'px';
  el.style.width = (note.width || 200) + 'px';
  el.style.height = (note.height || 200) + 'px';
  el.dataset.id = note.id;

  const { background } = applyNoteColorToElement(note, el);

  const controls = document.createElement('div');
  controls.className = 'controls';

  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = background;
  colorInput.defaultValue = background;
  colorInput.setAttribute('aria-label', 'Note color');
  colorInput.title = 'Choose note color';
  colorInput.addEventListener('input', (e) => {
    const nextColor = toHexColor(e.target.value, note.color);
    const defaultColor = getDefaultNoteColor();
    note.color = nextColor;
    if (nextColor === defaultColor) {
      note.colorToken = DEFAULT_NOTE_COLOR_TOKEN;
    } else if (note.colorToken) {
      delete note.colorToken;
    }
    const applied = applyNoteColorToElement(note, el);
    colorInput.value = applied.background;
    void saveNotes();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'delete-note';
  deleteBtn.addEventListener('click', () => {
    notes = notes.filter((n) => n.id !== note.id);
    el.remove();
    void saveNotes();
  });

  controls.appendChild(colorInput);
  controls.appendChild(deleteBtn);
  el.appendChild(controls);

  const textarea = document.createElement('textarea');
  textarea.value = note.content;
  textarea.addEventListener('input', (e) => {
    note.content = e.target.value;
    void saveNotes();
  });
  el.appendChild(textarea);
  el.addEventListener('mouseup', () => {
    note.width = el.offsetWidth;
    note.height = el.offsetHeight;
    saveNotes();
  });

  enableDrag(el, note);
  notesContainer.appendChild(el);
}

function addNote(content = '') {
  const defaultColor = getDefaultNoteColor();
  const note = {
    id: Date.now(),
    content,
    x: 50,
    y: 50,
    color: defaultColor,
    colorToken: DEFAULT_NOTE_COLOR_TOKEN,
    width: 200,
    height: 200,
  };
  notes.push(note);
  createNoteElement(note);
  void saveNotes();
}

function enableDrag(el, note) {
  let offsetX, offsetY;
  function onMouseDown(e) {
    if (['TEXTAREA', 'INPUT', 'BUTTON'].includes(e.target.tagName)) return;
    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
  function onMouseMove(e) {
    note.x = e.clientX - offsetX;
    note.y = e.clientY - offsetY;
    el.style.left = note.x + 'px';
    el.style.top = note.y + 'px';
  }
  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    void saveNotes();
  }
  el.addEventListener('mousedown', onMouseDown);
}
async function init() {
  try {
    const dbp = getDB();
    if (!dbp) return;
    const db = await dbp;
    notes = (await db.getAll(STORE_NAME)) ?? [];

    let migrated = false;
    let shouldClearLegacy = false;
    notes = notes.map((note) => {
      if (!note) return note;
      if (normalizeNote(note)) {
        migrated = true;
      }
      return note;
    });

    if (notes.length === 0) {
      const legacyNotes = JSON.parse(
        localStorage.getItem('stickyNotes') || '[]',
      );
      if (legacyNotes.length) {
        notes = legacyNotes.map((legacyNote) => {
          normalizeNote(legacyNote);
          return legacyNote;
        });
        migrated = true;
        shouldClearLegacy = true;
      }
    }

    if (migrated) {
      await saveNotes();
    }

    if (shouldClearLegacy) {
      localStorage.removeItem('stickyNotes');
    }

    notes.forEach(createNoteElement);

    const params = new URLSearchParams(location.search);
    const sharedText = params.get('text');
    if (sharedText) {
      addNote(sharedText);
      history.replaceState(null, '', location.pathname);
    }
  } catch (err) {
    console.error('Failed to load notes', err);
    try {
      notes = JSON.parse(localStorage.getItem('stickyNotes') || '[]') || [];
      notes = notes.map((note) => {
        normalizeNote(note);
        return note;
      });
      notes.forEach(createNoteElement);
    } catch (e) {
      console.error('Failed to load legacy notes', e);
    }
  }
}

if (isBrowser && addNoteBtn) {
  addNoteBtn.addEventListener('click', addNote);
  void init();
}
