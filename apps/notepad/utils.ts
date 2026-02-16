export type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export const filterNotes = (notes: Note[], query: string) => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return notes;

  return notes.filter((note) => {
    const haystack = `${note.title}\n${note.content}`.toLowerCase();
    return haystack.includes(trimmed);
  });
};

export const getNoteStats = (content: string) => {
  const trimmed = content.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const chars = content.length;
  return { words, chars };
};
