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

async function saveNotes() {
  try {
    const dbp = getDB();
    if (!dbp) return;
    const db = await dbp;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.store.clear();
    for (const note of notes) {
      await tx.store.put(note);
    }
    await tx.done;
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
}

function enableDrag(el, note) {
  let offsetX = 0;
  let offsetY = 0;
  let pointerId = null;
  let frame = null;
  let pendingX = note.x;
  let pendingY = note.y;

  const applyPosition = () => {
    frame = null;
    note.x = pendingX;
    note.y = pendingY;
    el.style.left = note.x + 'px';
    el.style.top = note.y + 'px';
  };

  const queuePositionUpdate = () => {
    if (frame !== null) return;
    frame = requestAnimationFrame(applyPosition);
  };

  const endDrag = (event) => {
    if (pointerId === null || event.pointerId !== pointerId) return;
    if (frame !== null) {
      cancelAnimationFrame(frame);
      applyPosition();
    }
    if (typeof el.releasePointerCapture === 'function') {
      el.releasePointerCapture(pointerId);
    }
    pointerId = null;
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', endDrag);
    el.removeEventListener('pointercancel', endDrag);
    void saveNotes();
  };

  const onPointerMove = (event) => {
    if (pointerId === null || event.pointerId !== pointerId) return;
    pendingX = event.clientX - offsetX;
    pendingY = event.clientY - offsetY;
    queuePositionUpdate();
  };

  const onPointerDown = (event) => {
    if (pointerId !== null) return;
    if (['TEXTAREA', 'INPUT', 'BUTTON'].includes(event.target.tagName)) return;
    pointerId = event.pointerId;
    pendingX = note.x;
    pendingY = note.y;
    offsetX = event.clientX - note.x;
    offsetY = event.clientY - note.y;
    if (typeof el.setPointerCapture === 'function') {
      el.setPointerCapture(pointerId);
    }
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  };

  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', onPointerDown);
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
  void init();
}
