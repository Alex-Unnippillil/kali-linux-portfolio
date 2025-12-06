"use client";

import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { useNotesState, type Note, type NoteLabel } from './state';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function parseHexColor(color: string) {
  const trimmed = color.trim();
  const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(trimmed);
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  const value = Number.parseInt(hex, 16);
  if (Number.isNaN(value)) return null;
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function withAlpha(color: string, alpha: number) {
  const rgb = parseHexColor(color);
  if (!rgb) return undefined;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function getReadableTextColor(color: string) {
  const rgb = parseHexColor(color);
  if (!rgb) return undefined;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.6 ? '#0f172a' : '#f8fafc';
}

function formatUpdatedAt(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return date.toISOString();
  }
}

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
  ariaLabel?: string;
}

function FilterChip({ label, active, onClick, color, ariaLabel }: FilterChipProps) {
  const style = active && color
    ? {
        backgroundColor: withAlpha(color, 0.2) ?? color,
        borderColor: withAlpha(color, 0.6) ?? color,
        color: getReadableTextColor(color),
      }
    : color
    ? { borderColor: withAlpha(color, 0.6) ?? color }
    : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cx(
        'flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition focus:outline-none focus:ring focus:ring-sky-500/30 focus:ring-offset-2 focus:ring-offset-slate-900',
        active ? 'bg-white/10 text-slate-100 shadow-sm' : 'border-slate-700/60 text-slate-300 hover:bg-slate-800/60',
      )}
      style={style}
    >
      {color ? (
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      <span>{label}</span>
    </button>
  );
}

interface LabelToggleProps {
  label: NoteLabel;
  active: boolean;
  onToggle: () => void;
}

function LabelToggle({ label, active, onToggle }: LabelToggleProps) {
  const style = active
    ? {
        backgroundColor: withAlpha(label.color, 0.25) ?? label.color,
        borderColor: withAlpha(label.color, 0.6) ?? label.color,
        color: getReadableTextColor(label.color),
      }
    : { borderColor: withAlpha(label.color, 0.6) ?? label.color };

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cx(
        'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition focus:outline-none focus:ring focus:ring-sky-500/30 focus:ring-offset-2 focus:ring-offset-slate-900',
        active ? 'shadow-sm' : 'text-slate-300 hover:bg-slate-800/60',
      )}
      style={style}
    >
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: label.color }}
      />
      <span>{label.name}</span>
    </button>
  );
}

interface NoteCardProps {
  note: Note;
  labels: NoteLabel[];
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onToggleLabel: (labelId: string) => void;
  onArchive: () => void;
  onDelete: () => void;
}

function NoteCard({
  note,
  labels,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDragLeave,
  onDrop,
  onTitleChange,
  onContentChange,
  onToggleLabel,
  onArchive,
  onDelete,
}: NoteCardProps) {
  const assignedLabels = labels.filter((label) => note.labelIds.includes(label.id));
  const primaryColor = assignedLabels[0]?.color;
  const cardStyle = primaryColor
    ? {
        borderColor: withAlpha(primaryColor, 0.55) ?? primaryColor,
        backgroundColor: withAlpha(primaryColor, 0.12) ?? undefined,
      }
    : undefined;

  return (
    <article
      role="listitem"
      aria-label={note.title || 'Untitled note'}
      className={cx(
        'group flex h-full flex-col rounded-xl border border-slate-700/60 bg-slate-900/70 p-3 shadow transition',
        isDragOver ? 'ring-2 ring-sky-400/60 ring-offset-2 ring-offset-slate-900' : 'ring-0',
        note.archived ? 'opacity-75' : 'opacity-100',
      )}
      style={cardStyle}
      onDragEnter={(event) => {
        event.preventDefault();
        onDragEnter();
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) {
          onDragLeave();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <input
          type="text"
          value={note.title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Title"
          aria-label="Note title"
          className="w-full rounded-md border border-slate-700/60 bg-slate-900/60 px-2 py-1 text-sm font-semibold text-slate-100 shadow-sm focus:border-sky-400 focus:outline-none focus:ring focus:ring-sky-500/30"
        />
        <button
          type="button"
          className={cx(
            'flex h-8 w-8 items-center justify-center rounded-md border border-slate-700/60 bg-slate-800/70 text-slate-300 transition focus:outline-none focus:ring focus:ring-sky-500/30 focus:ring-offset-2 focus:ring-offset-slate-900',
            isDragging ? 'cursor-grabbing' : 'cursor-grab',
          )}
          aria-label="Drag note to reorder"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <span aria-hidden className="text-lg leading-none">☰</span>
        </button>
      </div>

      <textarea
        value={note.content}
        onChange={(event) => onContentChange(event.target.value)}
        placeholder="Write your note..."
        rows={5}
        aria-label="Note content"
        className="mt-3 min-h-[120px] flex-1 rounded-md border border-slate-700/60 bg-slate-900/60 px-2 py-2 text-sm text-slate-100 shadow-sm focus:border-sky-400 focus:outline-none focus:ring focus:ring-sky-500/30"
      />

      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Labels</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {labels.map((label) => (
            <LabelToggle
              key={label.id}
              label={label}
              active={note.labelIds.includes(label.id)}
              onToggle={() => onToggleLabel(label.id)}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>{formatUpdatedAt(note.updatedAt) || 'Just now'}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onArchive}
            className="rounded-md border border-slate-700/60 px-2 py-1 text-xs font-medium text-slate-200 transition hover:bg-slate-800/70 focus:outline-none focus:ring focus:ring-sky-500/30 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            {note.archived ? 'Restore' : 'Archive'}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md border border-rose-500/50 px-2 py-1 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20 focus:outline-none focus:ring focus:ring-rose-500/40 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ filterActive }: { filterActive: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-slate-700/60 bg-slate-900/60 p-8 text-center text-slate-400">
      <p className="text-sm">
        {filterActive
          ? 'No notes match the current filters yet. Try adjusting the chips above.'
          : 'Create your first note to capture ideas, tasks, or research leads.'}
      </p>
    </div>
  );
}

export default function NotesApp() {
  const {
    state: { notes, labels, filter },
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
  } = useNotesState();

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const visibleNotes = useMemo(() => {
    return notes.filter((note) => {
      if (filter.showArchived) {
        if (!note.archived) return false;
      } else if (note.archived) {
        return false;
      }
      if (filter.labelIds.length > 0) {
        return filter.labelIds.some((id) => note.labelIds.includes(id));
      }
      return true;
    });
  }, [notes, filter]);

  const sortedNotes = useMemo(
    () => [...visibleNotes].sort((a, b) => a.order - b.order),
    [visibleNotes],
  );

  const handleDragStart = (noteId: string) => (event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData('text/plain', noteId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingId(noteId);
    setDragOverId(noteId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDropOnNote = (targetId: string) => {
    if (!draggingId) return;
    if (draggingId === targetId) {
      handleDragEnd();
      return;
    }
    moveNote(draggingId, targetId);
    handleDragEnd();
  };

  const handleDropAtEnd = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!draggingId) return;
    moveNote(draggingId, null);
    handleDragEnd();
  };

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/70 px-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => addNote()}
              className="rounded-md border border-sky-500/50 bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/30 focus:outline-none focus:ring focus:ring-sky-500/40 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              New note
            </button>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Archive filter">
              <FilterChip
                label="Active"
                active={!filter.showArchived}
                onClick={() => setShowArchived(false)}
              />
              <FilterChip
                label="Archived"
                active={filter.showArchived}
                onClick={() => setShowArchived(true)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Label filters">
            <FilterChip
              label="All labels"
              active={filter.labelIds.length === 0}
              onClick={clearLabelFilters}
            />
            {labels.map((label) => (
              <FilterChip
                key={label.id}
                label={label.name}
                color={label.color}
                active={filter.labelIds.includes(label.id)}
                onClick={() => setFilterLabel(label.id)}
                ariaLabel={`Toggle filter for ${label.name}`}
              />
            ))}
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-6">
        {sortedNotes.length === 0 ? (
          <EmptyState filterActive={filter.labelIds.length > 0 || filter.showArchived} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3" role="list">
            {sortedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                labels={labels}
                isDragging={draggingId === note.id}
                isDragOver={dragOverId === note.id && draggingId !== note.id}
                onDragStart={handleDragStart(note.id)}
                onDragEnd={handleDragEnd}
                onDragEnter={() => {
                  if (!draggingId || draggingId === note.id) return;
                  setDragOverId(note.id);
                }}
                onDragLeave={() => {
                  if (dragOverId === note.id) {
                    setDragOverId(null);
                  }
                }}
                onDrop={() => handleDropOnNote(note.id)}
                onTitleChange={(value) => updateNote(note.id, { title: value })}
                onContentChange={(value) => updateNote(note.id, { content: value })}
                onToggleLabel={(labelId) => toggleNoteLabel(note.id, labelId)}
                onArchive={() => toggleArchive(note.id)}
                onDelete={() => deleteNote(note.id)}
              />
            ))}
          </div>
        )}
        <div
          className={cx(
            'mt-6 flex h-16 items-center justify-center rounded-xl border border-dashed border-slate-700/60 text-sm text-slate-400 transition',
            draggingId ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          onDragOver={(event) => event.preventDefault()}
          onDragEnter={() => setDragOverId(null)}
          onDrop={handleDropAtEnd}
        >
          Drop here to move to the end
        </div>
      </main>
    </div>
  );
}

