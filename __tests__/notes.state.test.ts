import {
  DEFAULT_NOTES_STATE,
  deleteNote,
  isNotesState,
  moveNote,
  reorderList,
  updateNoteLabel,
} from '../apps/notes/state';
import type { Note } from '../apps/notes/types';

describe('notes state helpers', () => {
  const cloneNote = (note: Note): Note => ({ ...note });

  it('reorders notes within a list', () => {
    const base = DEFAULT_NOTES_STATE.active.map(cloneNote);
    const sourceId = base[base.length - 1]?.id ?? '';
    const targetId = base[0]?.id ?? '';
    const reordered = reorderList(base, sourceId, targetId);
    expect(reordered[0]?.id).toBe(sourceId);
    expect(reordered).not.toBe(base);
  });

  it('moves notes between active and archived lists', () => {
    const active = DEFAULT_NOTES_STATE.active.map(cloneNote);
    const archived = DEFAULT_NOTES_STATE.archived.map(cloneNote);
    const state = { active, archived };
    const idToMove = active[0].id;
    const archivedState = moveNote(state, idToMove, true);
    expect(archivedState.active.some((note) => note.id === idToMove)).toBe(
      false,
    );
    expect(archivedState.archived[0].id).toBe(idToMove);

    const restored = moveNote(archivedState, idToMove, false);
    expect(restored.active[0].id).toBe(idToMove);
    expect(restored.archived.some((note) => note.id === idToMove)).toBe(false);
  });

  it('updates note labels in place', () => {
    const active = DEFAULT_NOTES_STATE.active.map(cloneNote);
    const archived = DEFAULT_NOTES_STATE.archived.map(cloneNote);
    const state = { active, archived };
    const idToUpdate = active[1].id;
    const result = updateNoteLabel(state, idToUpdate, 'personal');
    expect(
      result.active.find((note) => note.id === idToUpdate)?.labelId,
    ).toBe('personal');
  });

  it('deletes notes from either list', () => {
    const active = DEFAULT_NOTES_STATE.active.map(cloneNote);
    const archived = DEFAULT_NOTES_STATE.archived.map(cloneNote);
    const state = { active, archived };
    const idToDelete = archived[0].id;
    const updated = deleteNote(state, idToDelete);
    expect(updated.archived.some((note) => note.id === idToDelete)).toBe(false);
  });

  it('validates persisted state shape', () => {
    expect(isNotesState(DEFAULT_NOTES_STATE)).toBe(true);
    expect(isNotesState({ active: [], archived: [{ bad: true }] })).toBe(false);
  });
});
