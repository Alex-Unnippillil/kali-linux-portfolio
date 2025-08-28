const notesContainer = document.getElementById('notes');
const addNoteBtn = document.getElementById('add-note');
let notes = JSON.parse(localStorage.getItem('stickyNotes') || '[]');

function saveNotes() {
  localStorage.setItem('stickyNotes', JSON.stringify(notes));
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
    saveNotes();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'delete-note';
  deleteBtn.addEventListener('click', () => {
    notes = notes.filter((n) => n.id !== note.id);
    el.remove();
    saveNotes();
  });

  controls.appendChild(colorInput);
  controls.appendChild(deleteBtn);
  el.appendChild(controls);

  const textarea = document.createElement('textarea');
  textarea.value = note.content;
  textarea.addEventListener('input', (e) => {
    note.content = e.target.value;
    saveNotes();
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
  saveNotes();
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
    saveNotes();
  }
  el.addEventListener('mousedown', onMouseDown);
}

addNoteBtn.addEventListener('click', addNote);
notes.forEach(createNoteElement);


export {};
