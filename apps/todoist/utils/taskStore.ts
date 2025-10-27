import { nanoid } from 'nanoid/non-secure';

export const STORAGE_KEY = 'portfolio.todoist.state';

export interface Task {
  id: string;
  title: string;
  dueDate?: string;
  sectionId: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  name: string;
  taskIds: string[];
}

export interface TodoistState {
  sections: Section[];
  tasks: Record<string, Task>;
}

export interface TaskInput {
  id?: string;
  title: string;
  dueDate?: string | null;
  sectionId?: string;
  sectionName?: string;
  completed?: boolean;
}

export interface SectionInput {
  id?: string;
  name: string;
}

export const DEFAULT_SECTIONS: Section[] = [
  { id: 'today', name: 'Today', taskIds: [] },
  { id: 'upcoming', name: 'Upcoming', taskIds: [] },
  { id: 'someday', name: 'Someday', taskIds: [] },
];

export function createEmptyState(): TodoistState {
  return {
    sections: DEFAULT_SECTIONS.map((section) => ({ ...section, taskIds: [] })),
    tasks: {},
  };
}

export function slugifySectionName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function titleCase(value: string): string {
  return value
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function cloneState(state: TodoistState): TodoistState {
  return {
    sections: state.sections.map((section) => ({
      ...section,
      taskIds: [...section.taskIds],
    })),
    tasks: { ...state.tasks },
  };
}

export function ensureSection(
  state: TodoistState,
  input: SectionInput,
): TodoistState {
  const id = input.id || slugifySectionName(input.name);
  const exists = state.sections.some((section) => section.id === id);
  if (exists) {
    return state;
  }
  const next: TodoistState = cloneState(state);
  next.sections = [
    ...next.sections,
    {
      id,
      name: input.name.trim() || titleCase(id),
      taskIds: [],
    },
  ];
  return next;
}

export function addSection(
  state: TodoistState,
  input: SectionInput,
): TodoistState {
  return ensureSection(state, input);
}

function resolveSectionId(
  state: TodoistState,
  sectionId?: string,
  sectionName?: string,
): { id: string; state: TodoistState } {
  if (sectionId && state.sections.some((section) => section.id === sectionId)) {
    return { id: sectionId, state };
  }
  if (sectionName) {
    const slug = slugifySectionName(sectionName);
    const next = ensureSection(state, { id: slug, name: sectionName });
    return { id: slug, state: next };
  }
  const fallback = state.sections[0]?.id || slugifySectionName('Today');
  if (!state.sections.length) {
    const next = ensureSection(state, { id: fallback, name: titleCase(fallback) });
    return { id: fallback, state: next };
  }
  return { id: fallback, state };
}

function insertTaskId(taskIds: string[], taskId: string, index?: number): string[] {
  const next = [...taskIds];
  if (typeof index === 'number' && index >= 0 && index <= next.length) {
    next.splice(index, 0, taskId);
  } else {
    next.push(taskId);
  }
  return next;
}

export function createTask(
  state: TodoistState,
  input: TaskInput,
  index?: number,
): TodoistState {
  const cleanTitle = input.title.trim();
  if (!cleanTitle) {
    return state;
  }
  const id = input.id || nanoid();
  const timestamp = new Date().toISOString();
  const resolved = resolveSectionId(state, input.sectionId, input.sectionName);
  const next = cloneState(resolved.state);
  let sectionIndex = next.sections.findIndex((section) => section.id === resolved.id);
  if (sectionIndex === -1) {
    next.sections.push({ id: resolved.id, name: titleCase(resolved.id), taskIds: [] });
    sectionIndex = next.sections.length - 1;
  }
  const targetSection = next.sections[sectionIndex];
  next.sections[sectionIndex] = {
    ...targetSection,
    taskIds: insertTaskId(targetSection.taskIds, id, index),
  };
  next.tasks[id] = {
    id,
    title: cleanTitle,
    dueDate: input.dueDate ? input.dueDate : undefined,
    sectionId: resolved.id,
    completed: Boolean(input.completed),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return next;
}

export function updateTask(
  state: TodoistState,
  taskId: string,
  patch: Partial<Omit<Task, 'id' | 'sectionId'>> & {
    sectionId?: string;
    sectionName?: string;
  },
): TodoistState {
  const task = state.tasks[taskId];
  if (!task) {
    return state;
  }
  let next = cloneState(state);
  let targetSectionId = task.sectionId;
  if (patch.sectionId || patch.sectionName) {
    const resolved = resolveSectionId(next, patch.sectionId, patch.sectionName);
    next = resolved.state;
    targetSectionId = resolved.id;
    if (targetSectionId !== task.sectionId) {
      next = moveTask(next, taskId, targetSectionId);
    }
  }
  const updated: Task = {
    ...next.tasks[taskId],
    ...patch,
    sectionId: targetSectionId,
    dueDate:
      patch.dueDate === undefined
        ? next.tasks[taskId].dueDate
        : patch.dueDate || undefined,
    updatedAt: new Date().toISOString(),
  };
  next.tasks[taskId] = updated;
  return next;
}

export function toggleTaskCompletion(
  state: TodoistState,
  taskId: string,
): TodoistState {
  const task = state.tasks[taskId];
  if (!task) {
    return state;
  }
  const next = cloneState(state);
  next.tasks[taskId] = {
    ...task,
    completed: !task.completed,
    updatedAt: new Date().toISOString(),
  };
  return next;
}

export function deleteTask(state: TodoistState, taskId: string): TodoistState {
  if (!state.tasks[taskId]) {
    return state;
  }
  const next = cloneState(state);
  delete next.tasks[taskId];
  next.sections = next.sections.map((section) => ({
    ...section,
    taskIds: section.taskIds.filter((id) => id !== taskId),
  }));
  return next;
}

function removeTaskId(section: Section, taskId: string): Section {
  return {
    ...section,
    taskIds: section.taskIds.filter((id) => id !== taskId),
  };
}

export function moveTask(
  state: TodoistState,
  taskId: string,
  toSectionId: string,
  index?: number,
): TodoistState {
  const task = state.tasks[taskId];
  if (!task) {
    return state;
  }
  if (task.sectionId === toSectionId) {
    const next = cloneState(state);
    const sectionIndex = next.sections.findIndex((section) => section.id === task.sectionId);
    if (sectionIndex === -1) {
      return state;
    }
    const section = next.sections[sectionIndex];
    const filtered = section.taskIds.filter((id) => id !== taskId);
    next.sections[sectionIndex] = {
      ...section,
      taskIds: insertTaskId(filtered, taskId, index),
    };
    next.tasks[taskId] = {
      ...next.tasks[taskId],
      updatedAt: new Date().toISOString(),
    };
    return next;
  }

  let next = cloneState(state);
  const fromIndex = next.sections.findIndex((section) => section.id === task.sectionId);
  if (fromIndex === -1) {
    return state;
  }
  const toIndex = next.sections.findIndex((section) => section.id === toSectionId);
  if (toIndex === -1) {
    next = ensureSection(next, { id: toSectionId, name: titleCase(toSectionId) });
  }
  const updatedSections = next.sections.map((section) => {
    if (section.id === task.sectionId) {
      return removeTaskId(section, taskId);
    }
    if (section.id === toSectionId) {
      const taskIds = insertTaskId(section.taskIds.filter((id) => id !== taskId), taskId, index);
      return { ...section, taskIds };
    }
    return section;
  });
  const updatedTask = {
    ...next.tasks[taskId],
    sectionId: toSectionId,
    updatedAt: new Date().toISOString(),
  };
  return {
    sections: updatedSections,
    tasks: {
      ...next.tasks,
      [taskId]: updatedTask,
    },
  };
}

export function reorderTask(
  state: TodoistState,
  sectionId: string,
  fromIndex: number,
  toIndex: number,
): TodoistState {
  const section = state.sections.find((sec) => sec.id === sectionId);
  if (!section) {
    return state;
  }
  if (fromIndex === toIndex) {
    return state;
  }
  const next = cloneState(state);
  const target = next.sections.find((sec) => sec.id === sectionId);
  if (!target) {
    return state;
  }
  const taskIds = [...target.taskIds];
  const [taskId] = taskIds.splice(fromIndex, 1);
  if (!taskId) {
    return state;
  }
  taskIds.splice(toIndex, 0, taskId);
  target.taskIds = taskIds;
  return next;
}

export function serializeState(state: TodoistState): string {
  return JSON.stringify(state);
}

export function deserializeState(serialized: string | null | undefined): TodoistState {
  if (!serialized) {
    return createEmptyState();
  }
  try {
    const parsed = JSON.parse(serialized);
    if (!parsed || typeof parsed !== 'object') {
      return createEmptyState();
    }
    const sections = Array.isArray(parsed.sections)
      ? parsed.sections
          .filter((section: any) => section && section.id && section.name)
          .map((section: any) => ({
            id: String(section.id),
            name: String(section.name),
            taskIds: Array.isArray(section.taskIds)
              ? section.taskIds.map((id: any) => String(id)).filter(Boolean)
              : [],
          }))
      : [];
    const tasks = parsed.tasks && typeof parsed.tasks === 'object'
      ? Object.entries(parsed.tasks).reduce<Record<string, Task>>((acc, [id, value]) => {
          const task = value as Partial<Task>;
          if (task && typeof task === 'object' && task.title && task.sectionId) {
            acc[id] = {
              id,
              title: String(task.title),
              sectionId: String(task.sectionId),
              dueDate: task.dueDate ? String(task.dueDate) : undefined,
              completed: Boolean(task.completed),
              createdAt: task.createdAt ? String(task.createdAt) : new Date().toISOString(),
              updatedAt: task.updatedAt ? String(task.updatedAt) : new Date().toISOString(),
            };
          }
          return acc;
        }, {})
      : {};
    const baseSections = sections.length
      ? sections
      : DEFAULT_SECTIONS.map((section) => ({ ...section, taskIds: [] }));
    const normalizedSections = baseSections.map((section: Section) => ({
      ...section,
      taskIds: Array.isArray(section.taskIds)
        ? section.taskIds.filter((id: string) => Boolean(tasks[id]))
        : [],
    }));
    const sectionMap = new Map<string, Section>();
    normalizedSections.forEach((section) => {
      sectionMap.set(section.id, section);
    });
    Object.values(tasks).forEach((task) => {
      const existing = sectionMap.get(task.sectionId);
      if (existing) {
        if (!existing.taskIds.includes(task.id)) {
          existing.taskIds.push(task.id);
        }
      } else {
        const created: Section = {
          id: task.sectionId,
          name: titleCase(task.sectionId),
          taskIds: [task.id],
        };
        sectionMap.set(task.sectionId, created);
        normalizedSections.push(created);
      }
    });
    return {
      sections: normalizedSections,
      tasks,
    };
  } catch {
    return createEmptyState();
  }
}
