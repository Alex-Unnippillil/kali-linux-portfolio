'use client';

import type React from 'react';
import { useMemo, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import type { Note, NoteDraft } from './types';
import {
  DEFAULT_LABEL_ID,
  DEFAULT_NOTES_STATE,
  NOTE_LABELS,
  NOTE_LABEL_MAP,
  type NotesState,
  deleteNote,
  generateNoteId,
  isNotesState,
  moveNote,
  reorderList,
  updateNoteLabel,
} from './state';

interface DraggableHandlers {
  onDragStart: (event: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
}

interface FilterState {
  type: 'all' | 'archived' | 'label';
  labelId?: string;
}

interface NoteComposerProps {
  draft: NoteDraft;
  onDraftChange: (updater: (draft: NoteDraft) => NoteDraft) => void;
  onSubmit: () => void;
}

interface FilterChipsProps {
  filter: FilterState;
  onFilterChange: (next: FilterState) => void;
  archivedCount: number;
}

interface NoteSectionProps {
  title: string;
  notes: Note[];
  emptyMessage: string;
  isArchive?: boolean;
  onArchiveToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onLabelChange: (id: string, labelId: string) => void;
  onReorder: (fromId: string, toId: string | null) => void;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
}

interface NoteCardProps {
  note: Note;
  isArchive?: boolean;
  onArchiveToggle: () => void;
  onDelete: () => void;
  onLabelChange: (labelId: string) => void;
  dragging: boolean;
  dragHandlers: DraggableHandlers;
}

const STORAGE_KEY = 'notes-app-state-v1';

function NoteComposer({ draft, onDraftChange, onSubmit }: NoteComposerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleId = 'notes-title-input';
  const detailsId = 'notes-details-input';
  const disableSubmit =
    !draft.title.trim() && !draft.body.trim() ? true : isSubmitting;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (disableSubmit) return;
    setIsSubmitting(true);
    onSubmit();
    setIsSubmitting(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 md:flex-row">
          <label
            className="flex flex-1 flex-col text-sm text-slate-200"
            htmlFor={titleId}
          >
            <span className="mb-1 uppercase tracking-wide text-xs text-slate-400">
              Title
            </span>
            <input
              id={titleId}
              className="rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 shadow-inner focus:border-sky-400 focus:outline-none"
              placeholder="Red team daily brief"
              aria-label="Note title"
              value={draft.title}
              onChange={(event) =>
                onDraftChange((prev) => ({ ...prev, title: event.target.value }))
              }
            />
          </label>
          <div className="flex flex-1 flex-col text-sm text-slate-200">
            <span className="mb-1 uppercase tracking-wide text-xs text-slate-400">
              Label
            </span>
            <div className="flex flex-wrap gap-2">
              {NOTE_LABELS.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm transition ${
                    draft.labelId === label.id
                      ? 'ring-2 ring-offset-1 ring-offset-slate-950'
                      : 'opacity-70 hover:opacity-90'
                  }`}
                  style={{
                    backgroundColor: label.color,
                    color: label.textColor,
                    borderColor: label.borderColor,
                    borderWidth: draft.labelId === label.id ? 2 : 1,
                    borderStyle: 'solid',
                  }}
                  aria-pressed={draft.labelId === label.id}
                  onClick={() =>
                    onDraftChange((prev) => ({ ...prev, labelId: label.id }))
                  }
                >
                  {label.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <label
          className="flex flex-col text-sm text-slate-200"
          htmlFor={detailsId}
        >
          <span className="mb-1 uppercase tracking-wide text-xs text-slate-400">
            Details
          </span>
            <textarea
              id={detailsId}
              className="min-h-[120px] rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 shadow-inner focus:border-sky-400 focus:outline-none"
              placeholder="Drop findings, commands, or links to revisit."
              aria-label="Note details"
              value={draft.body}
              onChange={(event) =>
                onDraftChange((prev) => ({ ...prev, body: event.target.value }))
              }
            />
        </label>
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={disableSubmit}
            className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            Add note
          </button>
        </div>
      </div>
    </form>
  );
}

function FilterChips({ filter, onFilterChange, archivedCount }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={`rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
          filter.type === 'all'
            ? 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-400'
            : 'bg-slate-900/70 text-slate-200 hover:bg-slate-800'
        }`}
        onClick={() => onFilterChange({ type: 'all' })}
        aria-pressed={filter.type === 'all'}
      >
        All
      </button>
      {NOTE_LABELS.map((label) => (
        <button
          key={label.id}
          type="button"
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
            filter.type === 'label' && filter.labelId === label.id
              ? 'ring-2 ring-offset-1 ring-offset-slate-950'
              : 'hover:shadow'
          }`}
          style={{
            backgroundColor: label.color,
            color: label.textColor,
            borderColor: label.borderColor,
          }}
          aria-pressed={filter.type === 'label' && filter.labelId === label.id}
          onClick={() => onFilterChange({ type: 'label', labelId: label.id })}
        >
          {label.name}
        </button>
      ))}
      <button
        type="button"
        className={`rounded-full border border-amber-500/50 px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
          filter.type === 'archived'
            ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400'
            : 'bg-slate-900/70 text-amber-200 hover:bg-slate-800'
        }`}
        onClick={() => onFilterChange({ type: 'archived' })}
        aria-pressed={filter.type === 'archived'}
      >
        Archive{archivedCount ? ` (${archivedCount})` : ''}
      </button>
    </div>
  );
}

function NoteCard({
  note,
  isArchive,
  onArchiveToggle,
  onDelete,
  onLabelChange,
  dragging,
  dragHandlers,
}: NoteCardProps) {
  const label = NOTE_LABEL_MAP[note.labelId] ?? NOTE_LABELS[0];
  const timestamp = new Date(note.updatedAt);

  return (
    <article
      className={`group rounded-lg border border-white/10 bg-slate-900/70 p-4 text-slate-100 shadow transition ${
        dragging ? 'ring-2 ring-sky-400' : 'hover:border-sky-400/80'
      }`}
      draggable
      onDragStart={dragHandlers.onDragStart}
      onDragEnd={dragHandlers.onDragEnd}
      onDragOver={dragHandlers.onDragOver}
      onDrop={dragHandlers.onDrop}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
          style={{
            backgroundColor: label.color,
            color: label.textColor,
            borderColor: label.borderColor,
            borderWidth: 1,
            borderStyle: 'solid',
          }}
        >
          {label.name}
        </span>
        <time className="text-xs text-slate-400">
          Updated {timestamp.toLocaleString()}
        </time>
      </div>
      <div className="space-y-2">
        {note.title ? (
          <h3 className="text-lg font-semibold text-slate-50">{note.title}</h3>
        ) : null}
        {note.body ? (
          <p className="whitespace-pre-wrap text-sm text-slate-200">
            {note.body}
          </p>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
          Label
          <select
            className="rounded border border-slate-600 bg-slate-950/80 px-2 py-1 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
            value={note.labelId}
            onChange={(event) => onLabelChange(event.target.value)}
          >
            {NOTE_LABELS.map((labelOption) => (
              <option key={labelOption.id} value={labelOption.id}>
                {labelOption.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onArchiveToggle}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
              isArchive
                ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                : 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
            }`}
          >
            {isArchive ? 'Unarchive' : 'Archive'}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/30"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function NoteSection({
  title,
  notes,
  emptyMessage,
  isArchive,
  onArchiveToggle,
  onDelete,
  onLabelChange,
  onReorder,
  draggingId,
  setDraggingId,
}: NoteSectionProps) {
  const allowDrop = (event: React.DragEvent) => {
    if (draggingId) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDropOnContainer = (event: React.DragEvent) => {
    if (!draggingId) return;
    event.preventDefault();
    onReorder(draggingId, null);
    setDraggingId(null);
  };

  const createDragHandlers = (noteId: string): DraggableHandlers => ({
    onDragStart: (event) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', noteId);
      setDraggingId(noteId);
    },
    onDragEnd: () => {
      setDraggingId(null);
    },
    onDragOver: allowDrop,
    onDrop: (event) => {
      event.preventDefault();
      const fromId = event.dataTransfer.getData('text/plain') || draggingId;
      if (fromId && fromId !== noteId) {
        onReorder(fromId, noteId);
      }
      setDraggingId(null);
    },
  });

  return (
    <section className="space-y-3 rounded-xl border border-white/10 bg-slate-900/50 p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-50">{title}</h2>
        <span className="text-xs uppercase tracking-wide text-slate-400">
          {notes.length} note{notes.length === 1 ? '' : 's'}
        </span>
      </header>
      {notes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-600 bg-slate-900/60 p-4 text-sm text-slate-400">
          {emptyMessage}
        </p>
      ) : null}
      <div
        className="grid gap-4 md:grid-cols-2"
        onDragOver={allowDrop}
        onDrop={handleDropOnContainer}
      >
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            isArchive={isArchive}
            onArchiveToggle={() => onArchiveToggle(note.id)}
            onDelete={() => onDelete(note.id)}
            onLabelChange={(labelId) => onLabelChange(note.id, labelId)}
            dragging={draggingId === note.id}
            dragHandlers={createDragHandlers(note.id)}
          />
        ))}
      </div>
    </section>
  );
}

export default function NotesApp() {
  const [state, setState] = usePersistentState<NotesState>(
    STORAGE_KEY,
    DEFAULT_NOTES_STATE,
    isNotesState,
  );
  const [draft, setDraft] = useState<NoteDraft>({
    title: '',
    body: '',
    labelId: DEFAULT_LABEL_ID,
  });
  const [filter, setFilter] = useState<FilterState>({ type: 'all' });
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const filteredActive = useMemo(() => {
    if (filter.type === 'archived') return [];
    if (filter.type === 'label') {
      return state.active.filter((note) => note.labelId === filter.labelId);
    }
    return state.active;
  }, [state.active, filter]);

  const filteredArchive = useMemo(() => {
    if (filter.type === 'label') {
      return state.archived.filter((note) => note.labelId === filter.labelId);
    }
    return state.archived;
  }, [state.archived, filter]);

  const handleAddNote = () => {
    const title = draft.title.trim();
    const body = draft.body.trim();
    if (!title && !body) return;
    const now = Date.now();
    const note: Note = {
      id: generateNoteId(),
      title,
      body,
      labelId: draft.labelId || DEFAULT_LABEL_ID,
      createdAt: now,
      updatedAt: now,
    };
    setState((prev) => ({
      ...prev,
      active: [note, ...prev.active],
    }));
    setDraft((prev) => ({ ...prev, title: '', body: '' }));
    if (filter.type === 'archived') {
      setFilter({ type: 'all' });
    }
  };

  const handleArchive = (id: string) => {
    setState((prev) => moveNote(prev, id, true));
  };

  const handleUnarchive = (id: string) => {
    setState((prev) => moveNote(prev, id, false));
  };

  const handleDelete = (id: string) => {
    setState((prev) => deleteNote(prev, id));
  };

  const handleLabelChange = (id: string, labelId: string) => {
    setState((prev) => updateNoteLabel(prev, id, labelId));
  };

  const handleReorderActive = (fromId: string, toId: string | null) => {
    setState((prev) => {
      const nextList = reorderList(prev.active, fromId, toId);
      if (nextList === prev.active) return prev;
      return { ...prev, active: nextList };
    });
  };

  const handleReorderArchive = (fromId: string, toId: string | null) => {
    setState((prev) => {
      const nextList = reorderList(prev.archived, fromId, toId);
      if (nextList === prev.archived) return prev;
      return { ...prev, archived: nextList };
    });
  };

  const archivedCount = state.archived.length;
  const showingArchiveOnly = filter.type === 'archived';
  const archiveNotesToRender =
    filter.type === 'label'
      ? filteredArchive
      : showingArchiveOnly
      ? filteredArchive
      : state.archived;
  const shouldShowArchiveSection =
    showingArchiveOnly || filter.type === 'label' || archivedCount > 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 text-slate-100">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-50">Notes</h1>
        <p className="text-sm text-slate-400">
          Capture quick findings, build colour-coded labels, and park completed
          work in the archive.
        </p>
      </header>
      <NoteComposer
        draft={draft}
        onDraftChange={(updater) => setDraft((prev) => updater(prev))}
        onSubmit={handleAddNote}
      />
      <section className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
          Quick filters
        </h2>
        <FilterChips
          filter={filter}
          onFilterChange={setFilter}
          archivedCount={archivedCount}
        />
      </section>
      {!showingArchiveOnly && (
        <NoteSection
          title="Notes"
          notes={filteredActive}
          emptyMessage="No notes match this filter yet. Create one above or choose a different label."
          onArchiveToggle={handleArchive}
          onDelete={handleDelete}
          onLabelChange={handleLabelChange}
          onReorder={handleReorderActive}
          draggingId={draggingId}
          setDraggingId={setDraggingId}
        />
      )}
      {shouldShowArchiveSection ? (
        <NoteSection
          title="Archive"
          notes={archiveNotesToRender}
          emptyMessage="Archived notes will appear here once you move them from your board."
          isArchive
          onArchiveToggle={handleUnarchive}
          onDelete={handleDelete}
          onLabelChange={handleLabelChange}
          onReorder={handleReorderArchive}
          draggingId={draggingId}
          setDraggingId={setDraggingId}
        />
      ) : null}
    </div>
  );
}
