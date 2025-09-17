"use client";

import { isBrowser } from '../../utils/env';
import { getDb } from '../../utils/safeIDB';

const DB_NAME = 'stickyNotes';
const STORE_NAME = 'notes';
const DB_VERSION = 1;
const MAX_HISTORY = 10;

let notesContainer = null;
let addNoteBtn = null;
let exportBtn = null;
let importBtn = null;
let importInput = null;
let undoBtn = null;
let statusRegion = null;
let mergeRoot = null;

let dbPromise = null;
let notes = [];
const mergeHistory = [];
let pendingMerge = null;
let statusTimer = null;
let lastGeneratedId = Date.now();

function initDom() {
  if (!isBrowser) return;
  notesContainer = document.getElementById('notes');
  addNoteBtn = document.getElementById('add-note');
  exportBtn = document.getElementById('export-notes');
  importBtn = document.getElementById('import-notes');
  importInput = document.getElementById('import-notes-input');
  undoBtn = document.getElementById('undo-merge');
  statusRegion = document.getElementById('notes-status');
  mergeRoot = document.getElementById('merge-root');
}

initDom();

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

function updateIdSeedFromValue(value) {
  const matches = String(value ?? '')
    .match(/\d+/g)
    ?.map((chunk) => Number.parseInt(chunk, 10))
    .filter((num) => Number.isFinite(num));
  if (!matches || matches.length === 0) return;
  const candidate = Math.max(...matches);
  if (candidate > lastGeneratedId) {
    lastGeneratedId = candidate;
  }
}

function generateNoteId() {
  lastGeneratedId += 1;
  return `note-${lastGeneratedId}`;
}

function cloneNotes(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizeNote(raw) {
  const x = Number(raw?.x);
  const y = Number(raw?.y);
  const width = Number(raw?.width);
  const height = Number(raw?.height);
  const updatedAt = Number(raw?.updatedAt);
  const note = {
    id:
      raw && raw.id !== undefined && raw.id !== null
        ? String(raw.id)
        : generateNoteId(),
    content: typeof raw?.content === 'string' ? raw.content : '',
    x: Number.isFinite(x) ? x : 50,
    y: Number.isFinite(y) ? y : 50,
    color: typeof raw?.color === 'string' ? raw.color : '#fffa65',
    width: Number.isFinite(width) ? width : 200,
    height: Number.isFinite(height) ? height : 200,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
  };
  updateIdSeedFromValue(note.id);
  return note;
}

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

function renderNotes() {
  if (!notesContainer) return;
  notesContainer.innerHTML = '';
  notes.forEach((note) => {
    createNoteElement(note);
  });
}

function announce(message, persistent = false) {
  if (!statusRegion) {
    if (message) console.info(message);
    return;
  }
  if (statusTimer) {
    window.clearTimeout(statusTimer);
    statusTimer = null;
  }
  if (message) {
    statusRegion.textContent = message;
    statusRegion.dataset.visible = 'true';
    if (!persistent) {
      statusTimer = window.setTimeout(() => {
        if (statusRegion) {
          statusRegion.textContent = '';
          statusRegion.dataset.visible = 'false';
        }
      }, 5000);
    }
  } else {
    statusRegion.textContent = '';
    statusRegion.dataset.visible = 'false';
  }
}

function updateUndoButton() {
  if (!undoBtn) return;
  undoBtn.disabled = mergeHistory.length === 0;
}

function pushHistory() {
  mergeHistory.push(cloneNotes(notes));
  if (mergeHistory.length > MAX_HISTORY) {
    mergeHistory.shift();
  }
  updateUndoButton();
}

function undoMerge() {
  if (!mergeHistory.length) return;
  const previous = mergeHistory.pop();
  if (!previous) return;
  notes = previous.map((note) => normalizeNote(note));
  renderNotes();
  void saveNotes();
  announce('Merge undone.');
  updateUndoButton();
}

function createNoteElement(note) {
  if (!notesContainer) return;
  const el = document.createElement('div');
  el.className = 'note';
  el.style.left = `${note.x}px`;
  el.style.top = `${note.y}px`;
  el.style.backgroundColor = note.color;
  el.style.width = `${note.width || 200}px`;
  el.style.height = `${note.height || 200}px`;
  el.dataset.id = note.id;

  const controls = document.createElement('div');
  controls.className = 'controls';

  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = note.color;
  colorInput.addEventListener('input', (e) => {
    note.color = e.target.value;
    note.updatedAt = Date.now();
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
    announce('Note deleted.');
  });

  controls.appendChild(colorInput);
  controls.appendChild(deleteBtn);
  el.appendChild(controls);

  const textarea = document.createElement('textarea');
  textarea.value = note.content;
  textarea.addEventListener('input', (e) => {
    note.content = e.target.value;
    note.updatedAt = Date.now();
    void saveNotes();
  });
  el.appendChild(textarea);
  el.addEventListener('mouseup', () => {
    note.width = el.offsetWidth;
    note.height = el.offsetHeight;
    note.updatedAt = Date.now();
    void saveNotes();
  });

  enableDrag(el, note);
  notesContainer.appendChild(el);
}

function addNote(content = '') {
  const note = {
    id: generateNoteId(),
    content,
    x: 50,
    y: 50,
    color: '#fffa65',
    width: 200,
    height: 200,
    updatedAt: Date.now(),
  };
  notes.push(note);
  createNoteElement(note);
  void saveNotes();
  announce('Note added.');
}

function enableDrag(el, note) {
  let offsetX;
  let offsetY;
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
    el.style.left = `${note.x}px`;
    el.style.top = `${note.y}px`;
  }
  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    note.updatedAt = Date.now();
    void saveNotes();
  }
  el.addEventListener('mousedown', onMouseDown);
}

async function init() {
  try {
    const dbp = getDB();
    if (!dbp) return;
    const db = await dbp;
    const stored = await db.getAll(STORE_NAME);
    notes = Array.isArray(stored) ? stored.map((note) => normalizeNote(note)) : [];

    if (notes.length === 0) {
      const legacyNotes = JSON.parse(localStorage.getItem('stickyNotes') || '[]');
      if (legacyNotes.length) {
        notes = legacyNotes.map((note) => normalizeNote(note));
        await saveNotes();
        localStorage.removeItem('stickyNotes');
      }
    }

    renderNotes();

    const params = new URLSearchParams(location.search);
    const sharedText = params.get('text');
    if (sharedText) {
      addNote(sharedText);
      history.replaceState(null, '', location.pathname);
    }
  } catch (err) {
    console.error('Failed to load notes', err);
    try {
      const fallback = JSON.parse(localStorage.getItem('stickyNotes') || '[]');
      notes = Array.isArray(fallback)
        ? fallback.map((note) => normalizeNote(note))
        : [];
      renderNotes();
    } catch (e) {
      console.error('Failed to load legacy notes', e);
    }
  }
}

function exportNotes() {
  if (!notes.length) {
    announce('There are no notes to export.');
    return;
  }
  try {
    const data = JSON.stringify(notes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `sticky-notes-${timestamp}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    announce(`Exported ${notes.length} note${notes.length === 1 ? '' : 's'} as ${filename}.`);
  } catch (err) {
    console.error('Failed to export notes', err);
    announce('Failed to export notes.');
  }
}

function parseImportedNotes(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) {
    throw new Error('Import file must be a JSON array.');
  }
  return data.map((note) => normalizeNote(note));
}

async function handleImportChange(event) {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const imported = parseImportedNotes(text);
    processImportedNotes(imported);
  } catch (err) {
    console.error('Failed to import notes', err);
    announce(err instanceof Error ? err.message : 'Failed to import notes.');
  } finally {
    input.value = '';
  }
}

function processImportedNotes(imported) {
  if (!imported.length) {
    announce('Import file was empty.');
    return;
  }

  const existingMap = new Map(notes.map((note) => [note.id, note]));
  const seenConflictIds = new Set();
  const additions = [];
  const conflicts = [];

  imported.forEach((note) => {
    const existing = existingMap.get(note.id);
    if (!existing) {
      additions.push({ ...note });
      return;
    }
    if (!notesAreEqual(existing, note)) {
      if (seenConflictIds.has(note.id)) {
        additions.push({ ...note });
      } else {
        conflicts.push({ existing, incoming: { ...note } });
        seenConflictIds.add(note.id);
      }
    }
  });

  if (conflicts.length === 0) {
    if (!additions.length) {
      announce('Nothing new to import.');
      return;
    }
    pushHistory();
    const existingIds = new Set(notes.map((note) => note.id));
    const added = applyAdditions(additions, existingIds);
    renderNotes();
    void saveNotes();
    announce(`Imported ${added} new note${added === 1 ? '' : 's'}.`);
    return;
  }

  pendingMerge = { conflicts, additions };
  showConflictResolver(conflicts, additions);
}

function applyAdditions(additions, existingIds) {
  let added = 0;
  additions.forEach((note) => {
    const candidate = { ...note };
    while (existingIds.has(candidate.id)) {
      candidate.id = generateNoteId();
    }
    updateIdSeedFromValue(candidate.id);
    notes.push(candidate);
    existingIds.add(candidate.id);
    added += 1;
  });
  return added;
}

function notesAreEqual(a, b) {
  return (
    a.content === b.content &&
    a.color === b.color &&
    Math.round(a.x) === Math.round(b.x) &&
    Math.round(a.y) === Math.round(b.y) &&
    Math.round(a.width) === Math.round(b.width) &&
    Math.round(a.height) === Math.round(b.height)
  );
}

function showConflictResolver(conflicts, additions) {
  if (!mergeRoot) return;
  mergeRoot.innerHTML = '';
  mergeRoot.classList.add('active');
  mergeRoot.setAttribute('aria-hidden', 'false');

  const overlay = document.createElement('div');
  overlay.className = 'merge-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'merge-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'merge-dialog-title');

  const title = document.createElement('h2');
  title.id = 'merge-dialog-title';
  title.textContent = `Resolve ${conflicts.length} import conflict${
    conflicts.length === 1 ? '' : 's'
  }`;
  dialog.appendChild(title);

  const intro = document.createElement('p');
  intro.className = 'merge-intro';
  intro.textContent = 'Choose how to merge notes that share the same identifier.';
  dialog.appendChild(intro);

  if (additions.length) {
    const additionsInfo = document.createElement('p');
    additionsInfo.className = 'merge-additions';
    additionsInfo.textContent = `${additions.length} new note${
      additions.length === 1 ? '' : 's'
    } will be imported automatically.`;
    dialog.appendChild(additionsInfo);
  }

  const list = document.createElement('div');
  list.className = 'merge-conflict-list';

  conflicts.forEach((conflict, index) => {
    const section = document.createElement('section');
    section.className = 'conflict-item';
    section.dataset.index = String(index);

    const heading = document.createElement('h3');
    heading.textContent = `Note ${conflict.existing.id}`;
    section.appendChild(heading);

    const options = document.createElement('div');
    options.className = 'conflict-options';

    options.appendChild(
      createConflictOption(`conflict-${index}`, 'existing', 'Keep current note', true),
    );
    options.appendChild(
      createConflictOption(`conflict-${index}`, 'incoming', 'Replace with imported'),
    );
    options.appendChild(
      createConflictOption(
        `conflict-${index}`,
        'both',
        'Keep both (duplicate imported note)',
      ),
    );
    section.appendChild(options);

    const previews = document.createElement('div');
    previews.className = 'conflict-previews';
    previews.appendChild(createConflictPreview('Current note', conflict.existing));
    previews.appendChild(createConflictPreview('Imported note', conflict.incoming));
    section.appendChild(previews);

    list.appendChild(section);
  });

  dialog.appendChild(list);

  const actions = document.createElement('div');
  actions.className = 'merge-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'merge-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', cancelMerge);
  actions.appendChild(cancelBtn);

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.className = 'merge-confirm';
  confirmBtn.textContent = 'Finish Merge';
  confirmBtn.addEventListener('click', finalizeMerge);
  actions.appendChild(confirmBtn);

  dialog.appendChild(actions);
  overlay.appendChild(dialog);
  mergeRoot.appendChild(overlay);

  window.setTimeout(() => {
    confirmBtn.focus();
  }, 0);
}

function createConflictOption(name, value, label, checked = false) {
  const wrapper = document.createElement('label');
  wrapper.className = 'conflict-option';

  const input = document.createElement('input');
  input.type = 'radio';
  input.name = name;
  input.value = value;
  input.defaultChecked = checked;

  const span = document.createElement('span');
  span.textContent = label;

  wrapper.appendChild(input);
  wrapper.appendChild(span);
  return wrapper;
}

function createConflictPreview(title, note) {
  const wrapper = document.createElement('div');
  wrapper.className = 'conflict-preview';

  const heading = document.createElement('h4');
  heading.textContent = title;
  wrapper.appendChild(heading);

  const text = document.createElement('textarea');
  text.readOnly = true;
  text.value = note.content || '(empty)';
  wrapper.appendChild(text);

  const meta = document.createElement('dl');
  meta.className = 'conflict-meta';

  const entries = [
    ['Color', note.color],
    ['Position', `${Math.round(note.x)}, ${Math.round(note.y)}`],
    ['Size', `${Math.round(note.width)} × ${Math.round(note.height)}`],
  ];

  entries.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    meta.appendChild(dt);
    meta.appendChild(dd);
  });

  wrapper.appendChild(meta);
  return wrapper;
}

function hideMergeUi() {
  if (!mergeRoot) return;
  mergeRoot.classList.remove('active');
  mergeRoot.setAttribute('aria-hidden', 'true');
  mergeRoot.innerHTML = '';
}

function cancelMerge() {
  hideMergeUi();
  pendingMerge = null;
  announce('Import cancelled. No changes applied.');
}

function finalizeMerge() {
  if (!pendingMerge || !mergeRoot) return;
  const { conflicts, additions } = pendingMerge;
  const selections = conflicts.map((conflict, index) => {
    const choice = mergeRoot.querySelector(
      `input[name="conflict-${index}"]:checked`,
    )?.value;
    return { conflict, choice: choice || 'existing' };
  });

  applyMergeSelections(conflicts, additions, selections);
  pendingMerge = null;
  hideMergeUi();
}

function applyMergeSelections(conflicts, additions, selections) {
  pushHistory();
  const existingIds = new Set(notes.map((note) => note.id));
  const idToIndex = new Map(notes.map((note, index) => [note.id, index]));

  let replaced = 0;
  let duplicated = 0;

  selections.forEach(({ conflict, choice }) => {
    const index = idToIndex.get(conflict.existing.id);
    if (index === undefined) return;
    if (choice === 'incoming') {
      const updated = { ...conflict.incoming, id: conflict.existing.id };
      updateIdSeedFromValue(updated.id);
      notes[index] = updated;
      replaced += 1;
    } else if (choice === 'both') {
      const duplicate = { ...conflict.incoming };
      while (existingIds.has(duplicate.id)) {
        duplicate.id = generateNoteId();
      }
      updateIdSeedFromValue(duplicate.id);
      notes.push(duplicate);
      existingIds.add(duplicate.id);
      duplicated += 1;
    }
  });

  const added = applyAdditions(additions, existingIds);
  renderNotes();
  void saveNotes();

  const parts = [];
  if (replaced) parts.push(`replaced ${replaced} note${replaced === 1 ? '' : 's'}`);
  if (duplicated)
    parts.push(`kept ${duplicated} imported copy${duplicated === 1 ? '' : 'ies'}`);
  if (added) parts.push(`added ${added} new note${added === 1 ? '' : 's'}`);
  if (!parts.length) {
    parts.push('kept existing notes');
  }
  announce(`Merge complete: ${parts.join(', ')}.`);
}

function handleKeydown(event) {
  if (event.key === 'Escape' && pendingMerge) {
    event.preventDefault();
    cancelMerge();
  }
}

if (isBrowser) {
  if (!notesContainer) {
    initDom();
  }
  addNoteBtn?.addEventListener('click', () => addNote());
  exportBtn?.addEventListener('click', exportNotes);
  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', handleImportChange);
  }
  undoBtn?.addEventListener('click', undoMerge);
  document.addEventListener('keydown', handleKeydown);
  updateUndoButton();
  void init();
}
