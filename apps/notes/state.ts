import type { Note } from './types';

export interface NoteLabel {
  id: string;
  name: string;
  color: string;
  textColor: string;
  borderColor: string;
}

export interface NotesState {
  active: Note[];
  archived: Note[];
}

export const NOTE_LABELS: NoteLabel[] = [
  {
    id: 'general',
    name: 'General',
    color: '#1f2937',
    textColor: '#f9fafb',
    borderColor: '#4b5563',
  },
  {
    id: 'research',
    name: 'Research',
    color: '#0f766e',
    textColor: '#ecfdf5',
    borderColor: '#115e59',
  },
  {
    id: 'automation',
    name: 'Automation',
    color: '#7c3aed',
    textColor: '#ede9fe',
    borderColor: '#5b21b6',
  },
  {
    id: 'operations',
    name: 'Operations',
    color: '#1d4ed8',
    textColor: '#dbeafe',
    borderColor: '#1e40af',
  },
  {
    id: 'remediation',
    name: 'Remediation',
    color: '#b91c1c',
    textColor: '#fee2e2',
    borderColor: '#7f1d1d',
  },
  {
    id: 'personal',
    name: 'Personal',
    color: '#ca8a04',
    textColor: '#fef3c7',
    borderColor: '#a16207',
  },
];

export const NOTE_LABEL_MAP = NOTE_LABELS.reduce<Record<string, NoteLabel>>(
  (acc, label) => {
    acc[label.id] = label;
    return acc;
  },
  {},
);

const now = Date.now();

export const DEFAULT_NOTES_STATE: NotesState = {
  active: [
    {
      id: 'note-recon-checklist',
      title: 'Recon checklist',
      body: '• Map subdomains\n• Enumerate services\n• Capture TLS certificates',
      labelId: 'research',
      createdAt: now - 1000 * 60 * 60 * 6,
      updatedAt: now - 1000 * 60 * 60 * 6,
    },
    {
      id: 'note-detection-rules',
      title: 'Detection rules to tune',
      body: 'Baseline sshd auth failures\nAlert on new privileged users\nSilence cron job noise',
      labelId: 'operations',
      createdAt: now - 1000 * 60 * 60 * 24,
      updatedAt: now - 1000 * 60 * 60 * 24,
    },
    {
      id: 'note-field-kit',
      title: 'Field kit pack-out',
      body: '⚙️ Proxmark kit\n🔋 Battery bricks x3\n🛜 LTE router & SIM',
      labelId: 'general',
      createdAt: now - 1000 * 60 * 60 * 2,
      updatedAt: now - 1000 * 60 * 60 * 2,
    },
  ],
  archived: [
    {
      id: 'note-retrospective',
      title: 'Incident retrospective draft',
      body: 'Summarise containment timeline\nList tooling gaps\nAssign follow-ups before retro',
      labelId: 'remediation',
      createdAt: now - 1000 * 60 * 60 * 72,
      updatedAt: now - 1000 * 60 * 60 * 48,
    },
  ],
};

export const DEFAULT_LABEL_ID = NOTE_LABELS[0]?.id ?? 'general';

export function generateNoteId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `note-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isNote(value: unknown): value is Note {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.body === 'string' &&
    typeof value.labelId === 'string' &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number'
  );
}

export function isNotesState(value: unknown): value is NotesState {
  if (!isRecord(value)) return false;
  const active = value.active;
  const archived = value.archived;
  if (!Array.isArray(active) || !Array.isArray(archived)) return false;
  return active.every(isNote) && archived.every(isNote);
}

function updateList(
  list: Note[],
  id: string,
  updater: (note: Note) => Note | null,
) {
  const idx = list.findIndex((note) => note.id === id);
  if (idx === -1) return list;
  const next = list.slice();
  const updated = updater(list[idx]);
  if (updated === null) {
    next.splice(idx, 1);
    return next;
  }
  next[idx] = updated;
  return next;
}

export function reorderList(
  list: Note[],
  fromId: string,
  toId?: string | null,
) {
  const fromIndex = list.findIndex((note) => note.id === fromId);
  if (fromIndex === -1) return list;
  const next = list.slice();
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return list;
  let insertIndex: number;
  if (toId) {
    insertIndex = next.findIndex((note) => note.id === toId);
    if (insertIndex === -1) return list;
  } else {
    insertIndex = next.length;
  }
  next.splice(insertIndex, 0, moved);
  const unchanged =
    next.length === list.length &&
    next.every((note, idx) => note.id === list[idx].id);
  return unchanged ? list : next;
}

export function moveNote(
  state: NotesState,
  id: string,
  toArchive: boolean,
): NotesState {
  const sourceKey = toArchive ? 'active' : 'archived';
  const targetKey = toArchive ? 'archived' : 'active';
  const source = state[sourceKey];
  const idx = source.findIndex((note) => note.id === id);
  if (idx === -1) return state;
  const moving = source[idx];
  const nextSource = source.slice();
  nextSource.splice(idx, 1);
  const nextTarget = [
    { ...moving, updatedAt: Date.now() },
    ...state[targetKey],
  ];
  return {
    active: targetKey === 'active' ? nextTarget : nextSource,
    archived: targetKey === 'archived' ? nextTarget : nextSource,
  };
}

export function updateNoteLabel(
  state: NotesState,
  id: string,
  labelId: string,
): NotesState {
  if (!(labelId in NOTE_LABEL_MAP)) {
    return state;
  }
  if (state.active.some((note) => note.id === id)) {
    return {
      ...state,
      active: updateList(state.active, id, (note) => ({
        ...note,
        labelId,
        updatedAt: Date.now(),
      })),
    };
  }
  if (state.archived.some((note) => note.id === id)) {
    return {
      ...state,
      archived: updateList(state.archived, id, (note) => ({
        ...note,
        labelId,
        updatedAt: Date.now(),
      })),
    };
  }
  return state;
}

export function deleteNote(state: NotesState, id: string): NotesState {
  if (state.active.some((note) => note.id === id)) {
    return { ...state, active: updateList(state.active, id, () => null) };
  }
  if (state.archived.some((note) => note.id === id)) {
    return { ...state, archived: updateList(state.archived, id, () => null) };
  }
  return state;
}
