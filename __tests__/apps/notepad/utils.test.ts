import { filterNotes, getNoteStats, type Note } from '../../../apps/notepad/utils';

const sampleNotes: Note[] = [
  {
    id: '1',
    title: 'Security Ideas',
    content: 'Write down a safer auth checklist.',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    title: 'Weekend Plan',
    content: 'Play retro games and update portfolio.',
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
];

describe('notepad utils', () => {
  it('returns all notes for empty search', () => {
    expect(filterNotes(sampleNotes, '   ')).toEqual(sampleNotes);
  });

  it('filters notes by title or content in a case-insensitive way', () => {
    expect(filterNotes(sampleNotes, 'security')).toEqual([sampleNotes[0]]);
    expect(filterNotes(sampleNotes, 'RETRO')).toEqual([sampleNotes[1]]);
  });

  it('computes word and character counts', () => {
    expect(getNoteStats('hello world')).toEqual({ words: 2, chars: 11 });
    expect(getNoteStats('  ')).toEqual({ words: 0, chars: 2 });
  });
});
