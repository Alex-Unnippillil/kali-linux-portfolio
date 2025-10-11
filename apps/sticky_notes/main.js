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
let highestZ = 1;

function persistToLocalStorage() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem('stickyNotes', JSON.stringify(notes));
  } catch (storageErr) {
    console.error('Failed to persist sticky notes to localStorage', storageErr);
  }
}

async function saveNotes() {
  try {
    const dbp = getDB();
    if (!dbp) {
      persistToLocalStorage();
      return;
    }
    const db = await dbp;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.store.clear();
    for (const note of notes) {
      await tx.store.put(note);
    }
    await tx.done;
  } catch (err) {
    console.error('Failed to save notes', err);
    persistToLocalStorage();
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

  if (!note.zIndex) {
    highestZ += 1;
    note.zIndex = highestZ;
  }
  highestZ = Math.max(highestZ, note.zIndex);
  el.style.zIndex = String(note.zIndex);

  const header = document.createElement('div');
  header.className = 'note-header';

  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'note-handle';
  handle.title = 'Drag note';
  handle.setAttribute('aria-label', 'Drag note');

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
  });

  controls.appendChild(colorInput);
  controls.appendChild(deleteBtn);
  header.appendChild(handle);
  header.appendChild(controls);
  el.appendChild(header);

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
    void saveNotes();
  });

  const focusNote = () => {
    if (!notesContainer) return;
    if (note.zIndex === highestZ && el.classList.contains('note-active')) {
      return;
    }
    const siblings = notesContainer.querySelectorAll('.note');
    siblings.forEach((node) => {
      if (node !== el) {
        node.classList.remove('note-active');
      }
    });
    highestZ += 1;
    note.zIndex = highestZ;
    el.style.zIndex = String(note.zIndex);
    el.classList.add('note-active');
    void saveNotes();
  };

  el.addEventListener('mousedown', focusNote);

  enableDrag(handle, el, note, focusNote);
  notesContainer.appendChild(el);
}

function addNote(content = '') {
  const initialContent = typeof content === 'string' ? content : '';
  const note = {
    id: Date.now(),
    content: initialContent,
    x: 50,
    y: 50,
    color: '#fffa65',
    width: 200,
    height: 200,
    zIndex: highestZ + 1,
  };
  highestZ = note.zIndex;
  notes.push(note);
  createNoteElement(note);
  void saveNotes();
}

function enableDrag(handle, el, note, focusNote) {
  let offsetX, offsetY;
  function onMouseDown(e) {
    if (e.button && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    focusNote();
    offsetX = e.clientX - note.x;
    offsetY = e.clientY - note.y;
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
  handle.addEventListener('mousedown', onMouseDown);
}
async function init() {
  try {
    const dbp = getDB();
    if (!dbp) {
      if (typeof localStorage !== 'undefined') {
        notes = JSON.parse(localStorage.getItem('stickyNotes') || '[]');
      }
      if (notes.length) {
        const maxZ = notes.reduce((max, note) => {
          if (typeof note.zIndex === 'number') {
            return Math.max(max, note.zIndex);
          }
          return max;
        }, highestZ);
        highestZ = Math.max(highestZ, maxZ);
      }
      notes.forEach(createNoteElement);
      return;
    }
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

    if (notes.length) {
      const maxZ = notes.reduce((max, note) => {
        if (typeof note.zIndex === 'number') {
          return Math.max(max, note.zIndex);
        }
        return max;
      }, highestZ);
      highestZ = Math.max(highestZ, maxZ);
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
      if (typeof localStorage !== 'undefined') {
        notes = JSON.parse(localStorage.getItem('stickyNotes') || '[]');
      }
      if (notes.length) {
        const maxZ = notes.reduce((max, note) => {
          if (typeof note.zIndex === 'number') {
            return Math.max(max, note.zIndex);
          }
          return max;
        }, highestZ);
        highestZ = Math.max(highestZ, maxZ);
      }
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
