import { openDB } from 'idb';

const notesContainer = document.getElementById('notes');
const addNoteBtn = document.getElementById('add-note');

const DB_NAME = 'stickyNotes';
const STORE_NAME = 'notes';
const DB_VERSION = 1;

const dbPromise = openDB(DB_NAME, DB_VERSION, {
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

let notes = [];

async function saveNotes() {
  try {
    const db = await dbPromise;
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
  const el = document.createElement('div');
  el.className = 'note';
  el.style.left = note.x + 'px';
  el.style.top = note.y + 'px';
  el.style.backgroundColor = note.color;
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

  enableDrag(el, note);
  notesContainer.appendChild(el);
}

function addNote() {
  const note = {
    id: Date.now(),
    content: '',
    x: 50,
    y: 50,
    color: '#fffa65',
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
    const db = await dbPromise;
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

addNoteBtn.addEventListener('click', addNote);
void init();
