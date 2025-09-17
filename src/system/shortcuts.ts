const MODIFIER_ORDER = ['Ctrl', 'Alt', 'Shift', 'Meta'] as const;

const modifierAlias: Record<string, string> = {
  control: 'Ctrl',
  ctrl: 'Ctrl',
  option: 'Alt',
  alt: 'Alt',
  shift: 'Shift',
  super: 'Meta',
  meta: 'Meta',
  cmd: 'Meta',
  command: 'Meta',
  win: 'Meta',
};

export interface ShortcutOptions {
  /** Allow the handler to run while typing inside inputs/contentEditable */
  allowInInputs?: boolean;
  /** Prevent the native browser action when the shortcut fires (default: true) */
  preventDefault?: boolean;
  /** Stop event propagation after this handler runs (default: false) */
  stopPropagation?: boolean;
  /** Continue invoking remaining handlers for the same shortcut (default: false) */
  propagate?: boolean;
}

export type ShortcutScope = string | string[];
export type ShortcutHandler = (event: KeyboardEvent, scope: string | null) => boolean | void;

interface Registration {
  handler: ShortcutHandler;
  options: Required<ShortcutOptions>;
}

const globalRegistry = new Map<string, Set<Registration>>();
const scopedRegistry = new Map<string, Map<string, Set<Registration>>>();
const LISTENER_OPTIONS: AddEventListenerOptions = { capture: true };

let initialized = false;

function getDefaultOptions(options?: ShortcutOptions): Required<ShortcutOptions> {
  return {
    allowInInputs: options?.allowInInputs ?? false,
    preventDefault: options?.preventDefault ?? true,
    stopPropagation: options?.stopPropagation ?? false,
    propagate: options?.propagate ?? false,
  };
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    target.isContentEditable ||
    (target as HTMLInputElement).type === 'text' ||
    (target as HTMLInputElement).type === 'search' ||
    (target as HTMLInputElement).type === 'email' ||
    (target as HTMLInputElement).type === 'number' ||
    (target as HTMLInputElement).type === 'password'
  );
}

function normaliseKey(key: string): string {
  if (!key) return '';
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  switch (key) {
    case 'Esc':
      return 'Escape';
    default:
      return key;
  }
}

function normaliseCombo(combo: string): string {
  if (!combo) return '';
  const parts = combo
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);
  const modifiers = new Set<string>();
  let key: string | null = null;

  for (const part of parts) {
    const lower = part.toLowerCase();
    const alias = modifierAlias[lower];
    if (alias) {
      modifiers.add(alias);
    } else {
      key = normaliseKey(part);
    }
  }

  if (key === '?') {
    // On most layouts "?" requires Shift, ensure matching against Shift+?
    modifiers.add('Shift');
  }

  const orderedModifiers = MODIFIER_ORDER.filter((mod) => modifiers.has(mod));
  if (!key) {
    // If only modifiers were provided, treat the last modifier as the key
    key = orderedModifiers.pop() || '';
  }
  return [...orderedModifiers, key].filter(Boolean).join('+');
}

function getEventCombo(event: KeyboardEvent): string {
  const modifiers: string[] = [];
  if (event.ctrlKey) modifiers.push('Ctrl');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');
  if (event.metaKey) modifiers.push('Meta');
  const key = normaliseKey(event.key);
  if (key === '?') {
    // Maintain parity with normalisation rules
    if (!modifiers.includes('Shift')) modifiers.push('Shift');
  }
  return [...modifiers, key].filter(Boolean).join('+');
}

function getScopeCandidates(scope: string | null): string[] {
  if (!scope) return [];
  if (!scope.includes('#')) return [scope];
  const [base] = scope.split('#');
  if (base) {
    return [scope, base];
  }
  return [scope];
}

function resolveScopeFromEvent(event: KeyboardEvent): string | null {
  if (typeof document === 'undefined') return null;
  const target = event.target as HTMLElement | null;
  const container = target?.closest?.('.opened-window');
  if (container?.id) return container.id;
  const active = document.querySelector<HTMLElement>('.opened-window.z-30');
  return active?.id || null;
}

function cleanupIfIdle() {
  if (!initialized || typeof window === 'undefined') return;
  const hasGlobal = globalRegistry.size > 0;
  const hasScoped = Array.from(scopedRegistry.values()).some((map) => map.size > 0);
  if (!hasGlobal && !hasScoped) {
    window.removeEventListener('keydown', handleKeyDown, LISTENER_OPTIONS);
    initialized = false;
  }
}

function initialise() {
  if (initialized || typeof window === 'undefined') return;
  window.addEventListener('keydown', handleKeyDown, LISTENER_OPTIONS);
  initialized = true;
}

function runHandlers(
  registrations: Set<Registration> | undefined,
  event: KeyboardEvent,
  scope: string | null,
): boolean {
  if (!registrations || registrations.size === 0) return false;
  let handled = false;
  for (const reg of Array.from(registrations)) {
    if (!reg.options.allowInInputs && isEditableTarget(event.target)) {
      continue;
    }
    const result = reg.handler(event, scope);
    if (result === false) {
      continue;
    }
    handled = true;
    if (reg.options.preventDefault) {
      event.preventDefault();
    }
    if (reg.options.stopPropagation) {
      event.stopPropagation();
    }
    if (!reg.options.propagate) {
      break;
    }
  }
  return handled;
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented) return;
  const combo = getEventCombo(event);
  if (!combo) return;
  const scope = resolveScopeFromEvent(event);
  const scopes = getScopeCandidates(scope);

  for (const candidate of scopes) {
    const scopedCombos = scopedRegistry.get(candidate);
    if (!scopedCombos) continue;
    const registrations = scopedCombos.get(combo);
    if (runHandlers(registrations, event, candidate)) {
      return;
    }
  }

  const registrations = globalRegistry.get(combo);
  runHandlers(registrations, event, null);
}

function registerGlobal(combo: string, handler: ShortcutHandler, options?: ShortcutOptions) {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const normalised = normaliseCombo(combo);
  if (!normalised) {
    return () => {};
  }
  initialise();
  const registry = globalRegistry.get(normalised) ?? new Set<Registration>();
  globalRegistry.set(normalised, registry);
  const registration: Registration = {
    handler,
    options: getDefaultOptions(options),
  };
  registry.add(registration);
  return () => {
    const current = globalRegistry.get(normalised);
    current?.delete(registration);
    if (current && current.size === 0) {
      globalRegistry.delete(normalised);
    }
    cleanupIfIdle();
  };
}

function registerScoped(scope: string, combo: string, handler: ShortcutHandler, options?: ShortcutOptions) {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const normalised = normaliseCombo(combo);
  if (!normalised) {
    return () => {};
  }
  initialise();
  const scopeRegistry = scopedRegistry.get(scope) ?? new Map<string, Set<Registration>>();
  scopedRegistry.set(scope, scopeRegistry);
  const registrations = scopeRegistry.get(normalised) ?? new Set<Registration>();
  scopeRegistry.set(normalised, registrations);
  const registration: Registration = {
    handler,
    options: getDefaultOptions(options),
  };
  registrations.add(registration);
  return () => {
    const registryForScope = scopedRegistry.get(scope);
    const set = registryForScope?.get(normalised);
    set?.delete(registration);
    if (set && set.size === 0) {
      registryForScope?.delete(normalised);
    }
    if (registryForScope && registryForScope.size === 0) {
      scopedRegistry.delete(scope);
    }
    cleanupIfIdle();
  };
}

export function registerShortcut(
  combo: string,
  handler: ShortcutHandler,
  options?: ShortcutOptions,
): () => void {
  return registerGlobal(combo, handler, options);
}

export function registerScopedShortcut(
  scope: ShortcutScope,
  combo: string,
  handler: ShortcutHandler,
  options?: ShortcutOptions,
): () => void {
  const scopes = Array.isArray(scope) ? scope : [scope];
  const cleaners = scopes.map((s) => registerScoped(s, combo, handler, options));
  return () => {
    cleaners.forEach((fn) => fn());
  };
}

interface ScopedShortcutConfig {
  combo: string;
  handler: ShortcutHandler;
  options?: ShortcutOptions;
}

export function registerScopedShortcuts(
  scope: ShortcutScope,
  shortcuts: ScopedShortcutConfig[],
): () => void {
  const cleaners = shortcuts.map((shortcut) =>
    registerScopedShortcut(scope, shortcut.combo, shortcut.handler, shortcut.options),
  );
  return () => {
    cleaners.forEach((fn) => fn());
  };
}

export function getWindowScope(element: Element | null): string | null {
  if (!element) return null;
  if (typeof element.closest !== 'function') return null;
  const container = element.closest<HTMLElement>('.opened-window');
  return container?.id || null;
}

// Exposed only for unit tests to reset state between cases.
export function __resetShortcutRegistryForTests() {
  if (typeof window !== 'undefined' && initialized) {
    window.removeEventListener('keydown', handleKeyDown, LISTENER_OPTIONS);
    initialized = false;
  }
  globalRegistry.clear();
  scopedRegistry.clear();
}

