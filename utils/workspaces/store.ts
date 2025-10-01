import { safeLocalStorage } from '../safeStorage';
import projectsData from '../../data/projects.json';

export type WorkspaceTab = 'overview' | 'code' | 'links';

export interface WorkspaceProject {
  id: number;
  title: string;
  description: string;
  stack: string[];
  tags: string[];
  year: number;
  type: string;
  thumbnail: string;
  repo: string;
  demo: string;
  snippet: string;
  language: string;
}

export interface WorkspaceListItem extends WorkspaceProject {
  pinned: boolean;
  lastTab: WorkspaceTab;
}

interface WorkspaceState {
  pinned: number[];
  recent: number[];
  lastTabs: Record<number, WorkspaceTab>;
}

const DEFAULT_TAB: WorkspaceTab = 'overview';
const STORAGE_KEY = 'workspace-store';
const projects: WorkspaceProject[] = projectsData as WorkspaceProject[];
const projectIds = new Set(projects.map((project) => project.id));

const listeners = new Set<() => void>();

let hydrated = false;
let state: WorkspaceState = {
  pinned: [],
  recent: [],
  lastTabs: {},
};

function cloneState(next: WorkspaceState): WorkspaceState {
  return {
    pinned: [...next.pinned],
    recent: [...next.recent],
    lastTabs: { ...next.lastTabs },
  };
}

function isWorkspaceTab(value: unknown): value is WorkspaceTab {
  return value === 'overview' || value === 'code' || value === 'links';
}

function sanitizeState(raw: unknown): WorkspaceState {
  if (!raw || typeof raw !== 'object') {
    return cloneState(state);
  }
  const input = raw as Partial<WorkspaceState>;
  const pinned = Array.isArray(input.pinned)
    ? input.pinned.filter((id): id is number => projectIds.has(id))
    : [];
  const recent = Array.isArray(input.recent)
    ? input.recent.filter((id): id is number => projectIds.has(id))
    : [];
  const lastTabsEntries =
    input.lastTabs && typeof input.lastTabs === 'object'
      ? Object.entries(input.lastTabs).filter(([key, value]) =>
          projectIds.has(Number(key)) && isWorkspaceTab(value)
        )
      : [];
  const lastTabs: Record<number, WorkspaceTab> = {};
  for (const [key, value] of lastTabsEntries) {
    lastTabs[Number(key)] = value as WorkspaceTab;
  }
  return cloneState({ pinned, recent, lastTabs });
}

function persist(next: WorkspaceState) {
  if (!hydrated || !safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        pinned: next.pinned,
        recent: next.recent,
        lastTabs: next.lastTabs,
      })
    );
  } catch {
    // ignore persistence errors (e.g. private mode)
  }
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  if (!safeLocalStorage) {
    return;
  }
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state = sanitizeState(parsed);
  } catch {
    // ignore corrupted storage
  }
}

function emit(next: WorkspaceState) {
  state = cloneState(next);
  persist(state);
  listeners.forEach((listener) => listener());
}

function updateRecent(projectId: number, next: WorkspaceState) {
  next.recent = [projectId, ...next.recent.filter((id) => id !== projectId)];
}

function fuzzyWordScore(word: string, text: string): number | null {
  const needle = word.trim();
  if (!needle) return 0;
  const haystack = text.toLowerCase();
  const target = needle.toLowerCase();
  let score = 0;
  let lastIndex = -1;
  for (const char of target) {
    const index = haystack.indexOf(char, lastIndex + 1);
    if (index === -1) return null;
    score += index - lastIndex;
    lastIndex = index;
  }
  return score;
}

function fuzzyScore(query: string, text: string): number | null {
  const words = query
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (words.length === 0) return 0;
  let total = 0;
  for (const word of words) {
    const result = fuzzyWordScore(word, text);
    if (result === null) {
      return null;
    }
    total += result;
  }
  return total;
}

function computeSearchScore(project: WorkspaceProject, query: string): number | null {
  const fields = [
    project.title,
    project.description,
    project.stack.join(' '),
    project.tags.join(' '),
  ];
  let best: number | null = null;
  for (const field of fields) {
    const score = fuzzyScore(query, field);
    if (score === null) continue;
    if (best === null || score < best) {
      best = score;
    }
  }
  return best;
}

function sortProjects(
  items: WorkspaceProject[],
  current: WorkspaceState,
  query: string
): WorkspaceListItem[] {
  const normalized = query.trim().toLowerCase();
  const pinnedOrder = current.pinned;
  const results = items
    .map((project) => {
      const pinnedIndex = pinnedOrder.indexOf(project.id);
      const isPinned = pinnedIndex !== -1;
      const recentIndex = current.recent.indexOf(project.id);
      const searchScore = normalized
        ? computeSearchScore(project, normalized)
        : null;
      if (normalized && searchScore === null) {
        return null;
      }
      return {
        project,
        isPinned,
        pinnedIndex: isPinned ? pinnedIndex : Number.POSITIVE_INFINITY,
        recentIndex:
          recentIndex === -1 ? Number.POSITIVE_INFINITY : recentIndex,
        searchScore: searchScore ?? Number.POSITIVE_INFINITY,
      };
    })
    .filter(Boolean) as Array<{
    project: WorkspaceProject;
    isPinned: boolean;
    pinnedIndex: number;
    recentIndex: number;
    searchScore: number;
  }>;

  results.sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    if (a.isPinned && b.isPinned && a.pinnedIndex !== b.pinnedIndex) {
      return a.pinnedIndex - b.pinnedIndex;
    }
    if (normalized && a.searchScore !== b.searchScore) {
      return a.searchScore - b.searchScore;
    }
    if (a.recentIndex !== b.recentIndex) {
      return a.recentIndex - b.recentIndex;
    }
    return a.project.title.localeCompare(b.project.title);
  });

  return results.map(({ project, isPinned }) => ({
    ...project,
    pinned: isPinned,
    lastTab: current.lastTabs[project.id] ?? DEFAULT_TAB,
  }));
}

export function getOrderedProjects(query: string): WorkspaceListItem[] {
  hydrate();
  return sortProjects(projects, state, query);
}

export function togglePin(projectId: number) {
  if (!projectIds.has(projectId)) return;
  hydrate();
  const next = cloneState(state);
  if (next.pinned.includes(projectId)) {
    next.pinned = next.pinned.filter((id) => id !== projectId);
  } else {
    next.pinned = [...next.pinned, projectId];
  }
  emit(next);
}

export function selectProject(projectId: number) {
  if (!projectIds.has(projectId)) return;
  hydrate();
  const next = cloneState(state);
  updateRecent(projectId, next);
  emit(next);
  const tab = getLastTab(projectId);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('workspace-open', {
        detail: { projectId, tab },
      })
    );
  }
}

export function setLastActiveTab(projectId: number, tab: WorkspaceTab) {
  if (!projectIds.has(projectId) || !isWorkspaceTab(tab)) return;
  hydrate();
  const next = cloneState(state);
  if (next.lastTabs[projectId] === tab) return;
  next.lastTabs[projectId] = tab;
  emit(next);
}

export function getLastTab(projectId: number): WorkspaceTab {
  hydrate();
  if (!projectIds.has(projectId)) return DEFAULT_TAB;
  return state.lastTabs[projectId] ?? DEFAULT_TAB;
}

export function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): WorkspaceState {
  hydrate();
  return state;
}

export function getServerSnapshot(): WorkspaceState {
  return state;
}

export function resetStoreForTests(options?: { preserveStorage?: boolean }) {
  if (!options?.preserveStorage && safeLocalStorage) {
    try {
      safeLocalStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  hydrated = false;
  state = {
    pinned: [],
    recent: [],
    lastTabs: {},
  };
  listeners.clear();
}

export function getProjects(): WorkspaceProject[] {
  return projects;
}

export function getStateForTests(): WorkspaceState {
  hydrate();
  return state;
}

export { DEFAULT_TAB as defaultWorkspaceTab };
