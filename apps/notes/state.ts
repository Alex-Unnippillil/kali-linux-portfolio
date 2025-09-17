"use client";

import { useCallback, useEffect, useMemo } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

export interface NoteLabel {
  id: string;
  name: string;
  color: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  labelIds: string[];
  archived: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotesFilter {
  labelIds: string[];
  /**
   * When true, the UI should display archived notes instead of active ones.
   */
  showArchived: boolean;
}

export interface NotesState {
  notes: Note[];
  labels: NoteLabel[];
  filter: NotesFilter;
}

type NotesStateStorage = {
  notes?: Partial<Note>[];
  labels?: Partial<NoteLabel>[];
  filter?: Partial<NotesFilter>;
};

const STORAGE_KEY = 'notes-app-state-v1';

const DEFAULT_LABELS: readonly NoteLabel[] = [
  { id: 'inbox', name: 'Inbox', color: '#3B82F6' },
  { id: 'work', name: 'Work', color: '#F97316' },
  { id: 'research', name: 'Research', color: '#8B5CF6' },
  { id: 'personal', name: 'Personal', color: '#10B981' },
];

function createDefaultLabels(): NoteLabel[] {
  return DEFAULT_LABELS.map((label) => ({ ...label }));
}

function createDefaultState(): NotesState {
  return {
    notes: [],
    labels: createDefaultLabels(),
    filter: { labelIds: [], showArchived: false },
  };
}

function isValidStorage(value: unknown): value is NotesStateStorage {
  if (!value || typeof value !== 'object') return false;
  const storage = value as NotesStateStorage;
  if ('notes' in storage && !Array.isArray(storage.notes)) return false;
  if ('labels' in storage && !Array.isArray(storage.labels)) return false;
  if ('filter' in storage && typeof storage.filter !== 'object') return false;
  return true;
}

function sanitizeLabel(partial: Partial<NoteLabel> | undefined, index: number): NoteLabel | null {
  if (!partial || typeof partial !== 'object') return null;
  const fallback = DEFAULT_LABELS[index % DEFAULT_LABELS.length];
  const idCandidate =
    typeof partial.id === 'string' && partial.id.trim()
      ? partial.id.trim()
      : fallback?.id ?? `label-${index + 1}`;
  const name =
    typeof partial.name === 'string' && partial.name.trim()
      ? partial.name.trim()
      : fallback?.name ?? `Label ${index + 1}`;
  const color =
    typeof partial.color === 'string' && partial.color.trim()
      ? partial.color.trim()
      : fallback?.color ?? '#3B82F6';
  return { id: idCandidate, name, color };
}

function sanitizeLabels(raw: Partial<NoteLabel>[] | undefined): NoteLabel[] {
  const seen = new Set<string>();
  const source = Array.isArray(raw) && raw.length > 0 ? raw : createDefaultLabels();
  const labels: NoteLabel[] = [];
  source.forEach((partial, index) => {
    const candidate = sanitizeLabel(partial, index);
    if (!candidate) return;
    let id = candidate.id;
    let counter = 1;
    while (seen.has(id)) {
      id = `${candidate.id}-${counter++}`;
    }
    seen.add(id);
    labels.push({ ...candidate, id });
  });
  return labels.length > 0 ? labels : createDefaultLabels();
}

function sanitizeNote(
  partial: Partial<Note> | undefined,
  index: number,
  validLabelIds: Set<string>,
): Note | null {
  if (!partial || typeof partial !== 'object') return null;
  const now = new Date().toISOString();
  const id =
    typeof partial.id === 'string' && partial.id.trim()
      ? partial.id.trim()
      : typeof partial.id === 'number'
      ? `note-${partial.id}`
      : `note-${index + 1}`;
  const title = typeof partial.title === 'string' ? partial.title : '';
  const content = typeof partial.content === 'string' ? partial.content : '';
  const archived = typeof partial.archived === 'boolean' ? partial.archived : false;
  const order =
    typeof partial.order === 'number' && Number.isFinite(partial.order)
      ? partial.order
      : index;
  const createdAt =
    typeof partial.createdAt === 'string' && partial.createdAt
      ? partial.createdAt
      : now;
  const updatedAt =
    typeof partial.updatedAt === 'string' && partial.updatedAt
      ? partial.updatedAt
      : createdAt;
  const labelIds = Array.isArray(partial.labelIds)
    ? Array.from(
        new Set(
          partial.labelIds.filter(
            (labelId): labelId is string =>
              typeof labelId === 'string' && validLabelIds.has(labelId),
          ),
        ),
      )
    : [];

  return {
    id,
    title,
    content,
    labelIds,
    archived,
    order,
    createdAt,
    updatedAt,
  };
}

function sanitizeNotes(
  raw: Partial<Note>[] | undefined,
  validLabelIds: Set<string>,
): Note[] {
  if (!Array.isArray(raw)) return [];
  const notes: Note[] = [];
  const seen = new Set<string>();
  raw.forEach((partial, index) => {
    const note = sanitizeNote(partial, index, validLabelIds);
    if (!note) return;
    let id = note.id;
    let counter = 1;
    while (seen.has(id)) {
      id = `${note.id}-${counter++}`;
    }
    seen.add(id);
    notes.push({ ...note, id });
  });
  notes.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
    return a.id.localeCompare(b.id);
  });
  return notes.map((note, index) =>
    note.order === index ? note : { ...note, order: index },
  );
}

function sanitizeFilter(
  partial: Partial<NotesFilter> | undefined,
  validLabelIds: Set<string>,
): NotesFilter {
  if (!partial || typeof partial !== 'object') {
    return { labelIds: [], showArchived: false };
  }
  const labelIds = Array.isArray(partial.labelIds)
    ? partial.labelIds.filter((id): id is string => typeof id === 'string' && validLabelIds.has(id))
    : [];
  const unique = Array.from(new Set(labelIds));
  const showArchived = typeof partial.showArchived === 'boolean' ? partial.showArchived : false;
  return { labelIds: unique, showArchived };
}

export function sanitizeNotesState(value: unknown): NotesState {
  const storage: NotesStateStorage = isValidStorage(value) ? value : {};
  const labels = sanitizeLabels(storage.labels);
  const labelIdSet = new Set(labels.map((label) => label.id));
  const notes = sanitizeNotes(storage.notes, labelIdSet);
  const filter = sanitizeFilter(storage.filter, labelIdSet);

  const normalizedNotes = notes.map((note) => ({
    ...note,
    labelIds: note.labelIds.filter((id) => labelIdSet.has(id)),
  }));

  return {
    notes: normalizedNotes,
    labels,
    filter,
  };
}

function statesEqual(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    try {
      return crypto.randomUUID();
    } catch {
      // fall back if randomUUID is not available
    }
  }
  return `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function reorderNotesArray(
  notes: Note[],
  noteId: string,
  targetId: string | null,
): Note[] {
  const ordered = [...notes].sort((a, b) => a.order - b.order);
  const sourceIndex = ordered.findIndex((note) => note.id === noteId);
  if (sourceIndex === -1) return ordered;
  const [moved] = ordered.splice(sourceIndex, 1);
  let targetIndex = targetId ? ordered.findIndex((note) => note.id === targetId) : -1;
  if (targetIndex < 0 || targetIndex > ordered.length) {
    targetIndex = ordered.length;
  }
  ordered.splice(targetIndex, 0, moved);
  const now = new Date().toISOString();
  return ordered.map((note, index) => {
    if (note.order === index) return note;
    if (note.id === moved.id) {
      return { ...note, order: index, updatedAt: now };
    }
    return { ...note, order: index };
  });
}

export function useNotesState() {
  const [storedState, setStoredState, resetStoredState] = usePersistentState<NotesStateStorage>(
    STORAGE_KEY,
    () => createDefaultState(),
    isValidStorage,
  );

  const state = useMemo(() => sanitizeNotesState(storedState), [storedState]);

  useEffect(() => {
    if (!statesEqual(storedState, state)) {
      setStoredState(state);
    }
  }, [state, storedState, setStoredState]);

  const applyStateUpdate = useCallback(
    (updater: (previous: NotesState) => NotesState) => {
      setStoredState((prev) => {
        const base = sanitizeNotesState(prev);
        const next = sanitizeNotesState(updater(base));
        return next;
      });
    },
    [setStoredState],
  );

  const addNote = useCallback(
    (defaults?: Partial<Pick<Note, 'title' | 'content' | 'labelIds'>>) => {
      applyStateUpdate((prev) => {
        const validLabelIds = new Set(prev.labels.map((label) => label.id));
        let initialLabels: string[] = [];
        if (Array.isArray(defaults?.labelIds)) {
          initialLabels = defaults.labelIds.filter((id) => validLabelIds.has(id));
        } else if (prev.filter.labelIds.length === 1) {
          initialLabels = prev.filter.labelIds;
        }
        const now = new Date().toISOString();
        const note: Note = {
          id: generateId(),
          title: typeof defaults?.title === 'string' ? defaults.title : '',
          content: typeof defaults?.content === 'string' ? defaults.content : '',
          labelIds: Array.from(new Set(initialLabels)),
          archived: false,
          order: prev.notes.length,
          createdAt: now,
          updatedAt: now,
        };
        return { ...prev, notes: [...prev.notes, note] };
      });
    },
    [applyStateUpdate],
  );

  const updateNote = useCallback(
    (noteId: string, changes: Partial<Pick<Note, 'title' | 'content' | 'labelIds'>>) => {
      applyStateUpdate((prev) => {
        const index = prev.notes.findIndex((note) => note.id === noteId);
        if (index === -1) return prev;
        const validLabelIds = new Set(prev.labels.map((label) => label.id));
        const nextNotes = [...prev.notes];
        const current = nextNotes[index];
        let modified = false;
        let nextNote = { ...current };
        if (typeof changes.title === 'string' && changes.title !== current.title) {
          nextNote = { ...nextNote, title: changes.title, updatedAt: new Date().toISOString() };
          modified = true;
        }
        if (typeof changes.content === 'string' && changes.content !== current.content) {
          nextNote = { ...nextNote, content: changes.content, updatedAt: new Date().toISOString() };
          modified = true;
        }
        if (Array.isArray(changes.labelIds)) {
          const sanitizedLabels = Array.from(
            new Set(changes.labelIds.filter((id) => typeof id === 'string' && validLabelIds.has(id))),
          );
          if (JSON.stringify(sanitizedLabels) !== JSON.stringify(current.labelIds)) {
            nextNote = {
              ...nextNote,
              labelIds: sanitizedLabels,
              updatedAt: new Date().toISOString(),
            };
            modified = true;
          }
        }
        if (!modified) return prev;
        nextNotes[index] = nextNote;
        return { ...prev, notes: nextNotes };
      });
    },
    [applyStateUpdate],
  );

  const deleteNote = useCallback(
    (noteId: string) => {
      applyStateUpdate((prev) => {
        if (!prev.notes.some((note) => note.id === noteId)) return prev;
        const remaining = prev.notes
          .filter((note) => note.id !== noteId)
          .map((note, index) => (note.order === index ? note : { ...note, order: index }));
        return { ...prev, notes: remaining };
      });
    },
    [applyStateUpdate],
  );

  const toggleArchive = useCallback(
    (noteId: string) => {
      applyStateUpdate((prev) => {
        const now = new Date().toISOString();
        const notes = prev.notes.map((note) =>
          note.id === noteId
            ? { ...note, archived: !note.archived, updatedAt: now }
            : note,
        );
        return { ...prev, notes };
      });
    },
    [applyStateUpdate],
  );

  const toggleNoteLabel = useCallback(
    (noteId: string, labelId: string) => {
      applyStateUpdate((prev) => {
        const valid = prev.labels.some((label) => label.id === labelId);
        if (!valid) return prev;
        const now = new Date().toISOString();
        const notes = prev.notes.map((note) => {
          if (note.id !== noteId) return note;
          const hasLabel = note.labelIds.includes(labelId);
          const nextLabels = hasLabel
            ? note.labelIds.filter((id) => id !== labelId)
            : [...note.labelIds, labelId];
          return { ...note, labelIds: nextLabels, updatedAt: now };
        });
        return { ...prev, notes };
      });
    },
    [applyStateUpdate],
  );

  const moveNote = useCallback(
    (noteId: string, targetId: string | null) => {
      applyStateUpdate((prev) => {
        const reordered = reorderNotesArray(prev.notes, noteId, targetId);
        if (statesEqual(reordered, prev.notes)) return prev;
        return { ...prev, notes: reordered };
      });
    },
    [applyStateUpdate],
  );

  const setFilterLabel = useCallback(
    (labelId: string) => {
      applyStateUpdate((prev) => {
        if (!prev.labels.some((label) => label.id === labelId)) return prev;
        const current = prev.filter.labelIds;
        const set = new Set(current);
        if (set.has(labelId)) {
          set.delete(labelId);
        } else {
          set.add(labelId);
        }
        const orderMap = new Map(prev.labels.map((label, index) => [label.id, index] as const));
        const nextLabels = Array.from(set).sort((a, b) =>
          (orderMap.get(a) ?? 0) - (orderMap.get(b) ?? 0),
        );
        if (JSON.stringify(nextLabels) === JSON.stringify(current)) return prev;
        return { ...prev, filter: { ...prev.filter, labelIds: nextLabels } };
      });
    },
    [applyStateUpdate],
  );

  const clearLabelFilters = useCallback(() => {
    applyStateUpdate((prev) => {
      if (prev.filter.labelIds.length === 0) return prev;
      return { ...prev, filter: { ...prev.filter, labelIds: [] } };
    });
  }, [applyStateUpdate]);

  const setShowArchived = useCallback(
    (show: boolean) => {
      applyStateUpdate((prev) => {
        if (prev.filter.showArchived === show) return prev;
        return { ...prev, filter: { ...prev.filter, showArchived: show } };
      });
    },
    [applyStateUpdate],
  );

  const reset = useCallback(() => {
    resetStoredState();
  }, [resetStoredState]);

  return {
    state,
    actions: {
      addNote,
      updateNote,
      deleteNote,
      toggleArchive,
      toggleNoteLabel,
      moveNote,
      setFilterLabel,
      clearLabelFilters,
      setShowArchived,
    },
    reset,
  } as const;
}

