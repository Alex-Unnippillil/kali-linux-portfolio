import { reorderNotesArray, sanitizeNotesState, type Note } from '../apps/notes/state';

describe('sanitizeNotesState', () => {
  it('adds default metadata when missing', () => {
    const state = sanitizeNotesState({
      notes: [{ id: 'note-1', title: 'Draft', content: 'Body text' }],
    });

    expect(state.notes).toHaveLength(1);
    const note = state.notes[0];
    expect(note.order).toBe(0);
    expect(note.archived).toBe(false);
    expect(note.labelIds).toEqual([]);
    expect(typeof note.createdAt).toBe('string');
    expect(state.labels.length).toBeGreaterThan(0);
  });

  it('filters invalid label references and preserves filter settings', () => {
    const state = sanitizeNotesState({
      labels: [
        { id: 'work', name: 'Work', color: '#ff8800' },
        { id: 'ideas', name: 'Ideas', color: '#38bdf8' },
      ],
      notes: [
        {
          id: 'note-2',
          title: 'Research',
          content: 'Investigate tooling',
          archived: true,
          labelIds: ['work', 'invalid', 'work'],
        },
      ],
      filter: { labelIds: ['work', 'invalid'], showArchived: true },
    });

    expect(state.notes[0].labelIds).toEqual(['work']);
    expect(state.filter.labelIds).toEqual(['work']);
    expect(state.filter.showArchived).toBe(true);
  });
});

describe('reorderNotesArray', () => {
  const createNote = (id: string, order: number): Note => ({
    id,
    title: id.toUpperCase(),
    content: `${id} content`,
    labelIds: [],
    archived: false,
    order,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  });

  it('moves a note before the target note and normalizes order', () => {
    const original = [createNote('a', 0), createNote('b', 1), createNote('c', 2)];
    const reordered = reorderNotesArray(original, 'c', 'a');

    expect(reordered.map((note) => note.id)).toEqual(['c', 'a', 'b']);
    expect(reordered[0].order).toBe(0);
    expect(reordered[1].order).toBe(1);
    expect(reordered[0].updatedAt).not.toEqual(original[2].updatedAt);
  });

  it('appends to the end when dropping without a target', () => {
    const original = [createNote('a', 0), createNote('b', 1), createNote('c', 2)];
    const reordered = reorderNotesArray(original, 'a', null);

    expect(reordered.map((note) => note.id)).toEqual(['b', 'c', 'a']);
    expect(reordered[2].order).toBe(2);
  });
});

