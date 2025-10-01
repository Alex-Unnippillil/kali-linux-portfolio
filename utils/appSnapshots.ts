"use client";

import { safeLocalStorage } from './safeStorage';
import { logEvent } from './analytics';

const STORAGE_KEY = 'kali-app-snapshots-v1';
const MAX_SNAPSHOTS_PER_APP = 20;

export const SNAPSHOT_CAPTURE_EVENT = 'kali:snapshot-capture';
export const SNAPSHOT_RESTORE_EVENT = 'kali:snapshot-restore';

const escapeSelector = (value: string) => {
  if (typeof value !== 'string') return value;
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/(["'\\#.:;?!=<>@\[\]\(\){}\s])/g, '\\$1');
};

export type SnapshotValue = string | boolean | string[];

export type SnapshotFieldKind =
  | 'text'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'select-multiple';

export interface SnapshotField {
  key: string;
  kind: SnapshotFieldKind;
  value: SnapshotValue;
  selector?: string;
  name?: string;
}

export interface SnapshotResult {
  key: string;
  value: string;
  selector?: string;
}

export interface SnapshotData {
  fields: SnapshotField[];
  results: SnapshotResult[];
  payload?: Record<string, unknown>;
}

export interface SnapshotContribution {
  fields?: SnapshotField[];
  results?: SnapshotResult[];
  payload?: Record<string, unknown>;
}

export interface SnapshotCaptureDetail {
  provide: (contribution: SnapshotContribution) => void;
}

export interface SnapshotRestoreDetail {
  snapshot: AppSnapshot;
}

export interface AppSnapshot {
  id: string;
  appId: string;
  name: string;
  note?: string;
  capturedAt: string;
  data: SnapshotData;
}

type SnapshotStore = Record<string, AppSnapshot[]>;

const canPersist = () => typeof window !== 'undefined' && !!safeLocalStorage;

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `snap-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isSnapshotField = (value: unknown): value is SnapshotField => {
  if (!value || typeof value !== 'object') return false;
  const field = value as SnapshotField;
  return (
    typeof field.key === 'string' &&
    typeof field.kind === 'string' &&
    Object.prototype.hasOwnProperty.call(field, 'value')
  );
};

const isSnapshotResult = (value: unknown): value is SnapshotResult => {
  if (!value || typeof value !== 'object') return false;
  const result = value as SnapshotResult;
  return typeof result.key === 'string' && typeof result.value === 'string';
};

const isSnapshotData = (value: unknown): value is SnapshotData => {
  if (!value || typeof value !== 'object') return false;
  const data = value as SnapshotData;
  if (!Array.isArray(data.fields) || !Array.isArray(data.results)) {
    return false;
  }
  if (!data.fields.every(isSnapshotField)) return false;
  if (!data.results.every(isSnapshotResult)) return false;
  if (data.payload && typeof data.payload !== 'object') return false;
  return true;
};

const isAppSnapshot = (value: unknown): value is AppSnapshot => {
  if (!value || typeof value !== 'object') return false;
  const snap = value as AppSnapshot;
  return (
    typeof snap.id === 'string' &&
    typeof snap.appId === 'string' &&
    typeof snap.name === 'string' &&
    typeof snap.capturedAt === 'string' &&
    isSnapshotData(snap.data)
  );
};

const readStore = (): SnapshotStore => {
  if (!canPersist()) return {};
  try {
    const raw = safeLocalStorage!.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const store: SnapshotStore = {};
    Object.entries(parsed as Record<string, unknown>).forEach(([key, value]) => {
      if (!Array.isArray(value)) return;
      const valid = value.filter(isAppSnapshot);
      if (valid.length > 0) {
        store[key] = valid;
      }
    });
    return store;
  } catch {
    return {};
  }
};

const writeStore = (store: SnapshotStore): void => {
  if (!canPersist()) return;
  try {
    safeLocalStorage!.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore storage errors
  }
};

export const clearAllSnapshots = (): void => {
  if (!canPersist()) return;
  try {
    safeLocalStorage!.removeItem(STORAGE_KEY);
  } catch {
    // ignore failures
  }
};

export const getSnapshotsForApp = (appId: string): AppSnapshot[] => {
  const store = readStore();
  return store[appId] ? [...store[appId]] : [];
};

const sortSnapshots = (snapshots: AppSnapshot[]): AppSnapshot[] =>
  [...snapshots].sort((a, b) =>
    new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
  );

export const saveSnapshotForApp = (
  appId: string,
  snapshot: AppSnapshot,
): AppSnapshot[] => {
  const store = readStore();
  const current = store[appId] ? [...store[appId]] : [];
  const next = sortSnapshots([snapshot, ...current]).slice(0, MAX_SNAPSHOTS_PER_APP);
  store[appId] = next;
  writeStore(store);
  return [...next];
};

export const deleteSnapshotForApp = (
  appId: string,
  snapshotId: string,
): AppSnapshot[] => {
  const store = readStore();
  const current = store[appId];
  if (!current) return [];
  const next = current.filter((snap) => snap.id !== snapshotId);
  if (next.length === 0) {
    delete store[appId];
  } else {
    store[appId] = next;
  }
  writeStore(store);
  return [...next];
};

export const buildSnapshotRecord = ({
  appId,
  name,
  note,
  data,
}: {
  appId: string;
  name: string;
  note?: string;
  data: SnapshotData;
}): AppSnapshot => ({
  id: generateId(),
  appId,
  name,
  note: note && note.trim() !== '' ? note : undefined,
  capturedAt: new Date().toISOString(),
  data,
});

const determineFieldKind = (element: Element): SnapshotFieldKind => {
  if (element instanceof HTMLTextAreaElement) {
    return 'textarea';
  }
  if (element instanceof HTMLSelectElement) {
    return element.multiple ? 'select-multiple' : 'select';
  }
  if (element instanceof HTMLInputElement) {
    const type = element.type;
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'file') return 'text';
    return 'text';
  }
  return 'text';
};

const deriveSelector = (element: Element, key: string): string | undefined => {
  if (element instanceof HTMLElement) {
    const explicit = element.getAttribute('data-snapshot-selector');
    if (explicit) return explicit;
  }
  if (element.id) {
    return `#${escapeSelector(element.id)}`;
  }
  if ('name' in element && element.name) {
    const tag = element.tagName.toLowerCase();
    return `${tag}[name="${escapeSelector(element.name)}"]`;
  }
  if (key) {
    return `[data-snapshot-key="${escapeSelector(key)}"]`;
  }
  return undefined;
};

const assignKey = (element: Element, index: number): string => {
  if (element instanceof HTMLElement) {
    const explicit = element.getAttribute('data-snapshot-key');
    if (explicit) return explicit;
  }
  if ('name' in element && element.name) return element.name;
  if (element.id) return element.id;
  return `field-${index}`;
};

const collectRadioGroups = (elements: HTMLInputElement[]): Map<string, SnapshotField> => {
  const groups = new Map<string, SnapshotField>();
  elements.forEach((input, index) => {
    const name = input.name || assignKey(input, index);
    const existing = groups.get(name);
    const selector = deriveSelector(input, name);
    const field: SnapshotField = existing || {
      key: name,
      kind: 'radio',
      value: '',
      selector,
      name,
    };
    if (input.checked) {
      field.value = input.value;
    }
    groups.set(name, field);
  });
  return groups;
};

export const captureSnapshotFromNode = (
  node: HTMLElement | null,
): SnapshotData => {
  if (!node) {
    return { fields: [], results: [] };
  }
  const root = node.querySelector('.windowMainScreen') as HTMLElement | null;
  const scope = root || node;
  const elements = Array.from(
    scope.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input, textarea, select',
    ),
  );

  const fields: SnapshotField[] = [];
  const radioInputs: HTMLInputElement[] = [];

  elements.forEach((element, index) => {
    const kind = determineFieldKind(element);
    if (kind === 'radio' && element instanceof HTMLInputElement) {
      radioInputs.push(element);
      return;
    }
    const key = assignKey(element, index);
    if (element instanceof HTMLElement) {
      element.setAttribute('data-snapshot-key', key);
    }
    const selector = deriveSelector(element, key);
    let value: SnapshotValue;
    if (element instanceof HTMLInputElement) {
      if (kind === 'checkbox') {
        value = element.checked;
      } else {
        value = element.value;
      }
    } else if (element instanceof HTMLSelectElement) {
      if (element.multiple) {
        value = Array.from(element.selectedOptions).map((option) => option.value);
      } else {
        value = element.value;
      }
    } else {
      value = element.value;
    }
    fields.push({ key, kind, value, selector, name: 'name' in element ? element.name : undefined });
  });

  const radioGroups = collectRadioGroups(radioInputs);
  radioGroups.forEach((field) => {
    fields.push(field);
  });

  const resultElements = Array.from(
    scope.querySelectorAll<HTMLElement>('[data-snapshot-result], output'),
  );
  const results: SnapshotResult[] = resultElements.map((element, index) => {
    const explicit = element.getAttribute('data-snapshot-result');
    const key = explicit && explicit.trim() !== '' ? explicit : `result-${index}`;
    element.setAttribute('data-snapshot-result', key);
    return {
      key,
      value: element.textContent ?? '',
      selector: deriveSelector(element, key),
    };
  });

  const contributions: SnapshotContribution[] = [];
  const detail: SnapshotCaptureDetail = {
    provide: (contribution) => {
      if (!contribution || typeof contribution !== 'object') return;
      contributions.push(contribution);
    },
  };

  scope.dispatchEvent(
    new CustomEvent<SnapshotCaptureDetail>(SNAPSHOT_CAPTURE_EVENT, {
      bubbles: true,
      cancelable: false,
      detail,
    }),
  );

  contributions.forEach((contribution) => {
    if (Array.isArray(contribution.fields)) {
      contribution.fields.filter(isSnapshotField).forEach((field) => {
        fields.push(field);
      });
    }
    if (Array.isArray(contribution.results)) {
      contribution.results.filter(isSnapshotResult).forEach((result) => {
        results.push(result);
      });
    }
  });

  const payload = contributions.reduce<Record<string, unknown>>((acc, contribution) => {
    if (contribution.payload && typeof contribution.payload === 'object') {
      return { ...acc, ...contribution.payload };
    }
    return acc;
  }, {});

  return {
    fields,
    results,
    payload: Object.keys(payload).length > 0 ? payload : undefined,
  };
};

const dispatchInputEvents = (element: HTMLElement) => {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
};

const applyFieldValue = (scope: HTMLElement, field: SnapshotField) => {
  const selectors: string[] = [];
  if (field.selector) selectors.push(field.selector);
  selectors.push(`[data-snapshot-key="${escapeSelector(field.key)}"]`);
  if (field.name) {
    selectors.push(`${field.kind === 'radio' ? 'input' : '*'}[name="${escapeSelector(field.name)}"]`);
  }
  selectors.push(`#${escapeSelector(field.key)}`);
  const target = selectors
    .map((selector) => {
      try {
        return scope.querySelector(selector);
      } catch {
        return null;
      }
    })
    .find((el) => el);

  if (!target) return;

  if (target instanceof HTMLInputElement) {
    if (field.kind === 'checkbox') {
      target.checked = Boolean(field.value);
      dispatchInputEvents(target);
    } else if (field.kind === 'radio') {
      const name = field.name || target.name;
      if (!name) return;
      const radios = scope.querySelectorAll<HTMLInputElement>(
        `input[type="radio"][name="${escapeSelector(name)}"]`,
      );
      radios.forEach((radio) => {
        radio.checked = radio.value === field.value;
        if (radio.checked) {
          dispatchInputEvents(radio);
        }
      });
    } else {
      target.value = typeof field.value === 'string' ? field.value : '';
      dispatchInputEvents(target);
    }
    return;
  }

  if (target instanceof HTMLSelectElement) {
    if (field.kind === 'select-multiple' && Array.isArray(field.value)) {
      const values = new Set(field.value.map(String));
      Array.from(target.options).forEach((option) => {
        option.selected = values.has(option.value);
      });
    } else {
      target.value = typeof field.value === 'string' ? field.value : String(field.value);
    }
    dispatchInputEvents(target);
    return;
  }

  if (target instanceof HTMLTextAreaElement) {
    target.value = typeof field.value === 'string' ? field.value : '';
    dispatchInputEvents(target);
    return;
  }

  if (field.kind === 'text') {
    (target as HTMLElement).textContent = typeof field.value === 'string' ? field.value : '';
  }
};

const applyResults = (scope: HTMLElement, results: SnapshotResult[]) => {
  results.forEach((result) => {
    const selectors: string[] = [];
    if (result.selector) selectors.push(result.selector);
    selectors.push(`[data-snapshot-result="${escapeSelector(result.key)}"]`);
    const target = selectors
      .map((selector) => {
        try {
          return scope.querySelector(selector);
        } catch {
          return null;
        }
      })
      .find((el) => el);
    if (target) {
      target.textContent = result.value;
    }
  });
};

export const applySnapshotToNode = (node: HTMLElement | null, snapshot: AppSnapshot): void => {
  if (!node) return;
  const root = node.querySelector('.windowMainScreen') as HTMLElement | null;
  const scope = root || node;
  snapshot.data.fields.forEach((field) => applyFieldValue(scope, field));
  applyResults(scope, snapshot.data.results);
  scope.dispatchEvent(
    new CustomEvent<SnapshotRestoreDetail>(SNAPSHOT_RESTORE_EVENT, {
      bubbles: true,
      cancelable: false,
      detail: { snapshot },
    }),
  );
};

export const recordSnapshotEvent = (
  action: 'create' | 'restore' | 'delete',
  appId: string,
  snapshotId?: string,
) => {
  try {
    logEvent({
      category: 'Snapshot',
      action,
      label: snapshotId ? `${appId}:${snapshotId}` : appId,
    });
  } catch {
    // ignore analytics errors
  }
};

export const snapshotsAvailable = () => canPersist();
