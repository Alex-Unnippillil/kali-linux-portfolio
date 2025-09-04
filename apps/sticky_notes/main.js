"use client";

/* eslint-disable no-top-level-window/no-top-level-window-or-document */
import { isBrowser } from '../../utils/env';
import { getDb } from '../../utils/safeIDB';

let notesContainer = null;
let addNoteBtn = null;
let searchInput = null;
let matches = [];
let currentMatch = 0;

function initDom() {
  if (!isBrowser) return;
  notesContainer = document.getElementById('notes');
  addNoteBtn = document.getElementById('add-note');
  searchInput = document.getElementById('search-notes');
}

initDom();

const DB_NAME = 'stickyNotes';
const STORE_NAME = 'notes';
const DB_VERSION = 1;

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

// OPFS index helpers
let opfsDir = null;
async function getIndexDir() {
  try {
    if (!opfsDir) {
      // @ts-ignore - OPFS not yet in TypeScript libs
      const root = await navigator.storage?.getDirectory();
      if (!root) return null;
      opfsDir = await root.getDirectoryHandle('sticky-notes', { create: true });
    }
    return opfsDir;
  } catch {
    return null;
  }
}

async function writeIndex() {
  const dir = await getIndexDir();
  if (!dir) return;
  try {
    const handle = await dir.getFileHandle('index.json', { create: true });
    const writable = await handle.createWritable();
    const data = notes.map(({ id, content }) => ({ id, content }));
    await writable.write(JSON.stringify(data));
    await writable.close();
  } catch {}
}

async function saveNotes() {
  try {
    const dbp = getDB();
    if (!dbp) return;
    const db = await dbp;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.store.clear();
    for (const note of notes) {
      const { id, content, x, y, color, width, height } = note;
      await tx.store.put({ id, content, x, y, color, width, height });
    }
    await tx.done;
    await writeIndex();
  } catch (err) {
    console.error('Failed to save notes', err);
  }
}

function createNoteElement(note) {
  if (!notesContainer) return;
  const el = document.createElement('div');
  el.className = 'note';
  el.style.left = note.x + 'px';
  el.style.top = note.y + 'px';
  el.style.backgroundColor = note.color;
  el.style.width = (note.width || 200) + 'px';
  el.style.height = (note.height || 200) + 'px';
  el.dataset.id = note.id;

  const controls = document.createElement('div');
  controls.className = 'controls';

  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = note.color;
  colorInput.addEventListener('input', (e) => {
    note.color = e.target.value;
    el.style.backgroundColor = note.color;
    void saveNotes();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'delete-note';
  deleteBtn.addEventListener('click', () => {
    notes = notes.filter((n) => n.id !== note.id);
    el.remove();
    void saveNotes();
    applySearch(searchInput?.value || '');
  });

  controls.appendChild(colorInput);
  controls.appendChild(deleteBtn);
  el.appendChild(controls);

  const textarea = document.createElement('div');
  textarea.className = 'note-content';
  textarea.contentEditable = 'true';
  textarea.innerText = note.content;
  textarea.addEventListener('input', () => {
    note.content = textarea.textContent;
    void saveNotes();
    applySearch(searchInput?.value || '');
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
  const note = {
    id: Date.now(),
    content,
    x: 50,
    y: 50,
    color: '#fffa65',
    width: 200,
    height: 200,
  };
  notes.push(note);
  createNoteElement(note);
  void saveNotes();
  applySearch(searchInput?.value || '');
}

function enableDrag(el, note) {
  let offsetX, offsetY;
  function onMouseDown(e) {
    if (
      ['INPUT', 'BUTTON'].includes(e.target.tagName) ||
      e.target.classList?.contains('note-content')
    )
      return;
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
    notes = await db.getAll(STORE_NAME);

    if (notes.length === 0) {
      const legacyNotes = JSON.parse(
        localStorage.getItem('stickyNotes') || '[]',
      );
      if (legacyNotes.length) {
        notes = legacyNotes;
        await saveNotes();
        localStorage.removeItem('stickyNotes');
      }
    }

    notes.forEach(createNoteElement);
    applySearch(searchInput?.value || '');

    const params = new URLSearchParams(location.search);
    const sharedText = params.get('text');
    if (sharedText) {
      addNote(sharedText);
      history.replaceState(null, '', location.pathname);
    }
  } catch (err) {
    console.error('Failed to load notes', err);
    try {
      notes = JSON.parse(localStorage.getItem('stickyNotes') || '[]');
      notes.forEach(createNoteElement);
    } catch (e) {
      console.error('Failed to load legacy notes', e);
    }
  }
}

if (isBrowser && addNoteBtn) {
  addNoteBtn.addEventListener('click', addNote);
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      applySearch(e.target.value);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (matches.length === 0) return;
        currentMatch += e.key === 'ArrowDown' ? 1 : -1;
        if (currentMatch < 0) currentMatch = matches.length - 1;
        if (currentMatch >= matches.length) currentMatch = 0;
        focusMatch(currentMatch);
      }
    });
  }
  void init();
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text, query) {
  if (!query) return escapeHTML(text);
  const regex = new RegExp(escapeRegExp(query), 'gi');
  return escapeHTML(text).replace(
    regex,
    (match) => `<mark class="search-match">${match}</mark>`,
  );
}

function applySearch(query) {
  matches.forEach((m) => m.classList.remove('search-current'));
  matches = [];
  currentMatch = 0;
  notes.forEach((note) => {
    const el = document.querySelector(
      `.note[data-id="${note.id}"] .note-content`,
    );
    if (!el) return;
    if (!query) {
      el.textContent = note.content;
      return;
    }
    el.innerHTML = highlightText(note.content, query);
  });
  if (query) {
    matches = Array.from(document.querySelectorAll('.search-match'));
    if (matches.length) focusMatch(0);
  }
}

function focusMatch(idx) {
  matches.forEach((m) => m.classList.remove('search-current'));
  const el = matches[idx];
  if (!el) return;
  el.classList.add('search-current');
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
