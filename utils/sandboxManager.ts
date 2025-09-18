import { trackEvent } from '@/lib/analytics-client';

export type NetworkPolicy = 'allow-all' | 'block-external' | 'isolate';

export interface SandboxConfig {
  label?: string;
  homes: string[];
  networkPolicy: NetworkPolicy;
}

export interface SandboxSession {
  id: string;
  label: string;
  homes: string[];
  networkPolicy: NetworkPolicy;
  createdAt: number;
  status: 'running';
}

export interface SandboxCleanupResult {
  sessionId: string | null;
  removedHomes: string[];
  errors: string[];
  hadStorage: boolean;
}

export interface NetworkPolicyDefinition {
  id: NetworkPolicy;
  label: string;
  description: string;
}

export const NETWORK_POLICIES: readonly NetworkPolicyDefinition[] = [
  {
    id: 'allow-all',
    label: 'Allow all traffic',
    description:
      'Standard mode. Apps keep normal connectivity with auditing hooks enabled for visibility.',
  },
  {
    id: 'block-external',
    label: 'Block external network',
    description:
      'Outbound requests are restricted to loopback and RFC1918 ranges to mimic an internal lab.',
  },
  {
    id: 'isolate',
    label: 'Isolate (offline)',
    description:
      'Fully offline sandbox. No network access is granted; only filesystem operations are permitted.',
  },
];

const SANDBOX_ROOT_DIR = 'sandboxes';
const DEFAULT_HOME = 'home/sandbox';

let activeSession: SandboxSession | null = null;
let appliedPolicy: NetworkPolicy = 'allow-all';
const sandboxWindows = new Set<string>();

function emitSandboxUpdate() {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('sandbox-windows-changed'));
  }
}

function sanitizeLabel(raw?: string): string {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return 'Sandbox';
  const collapsed = trimmed.replace(/\s+/g, ' ');
  return collapsed.slice(0, 80);
}

function slugifyLabel(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'sandbox';
}

function normalizeHomes(homes: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  homes.forEach((entry) => {
    const normalized = normalizeHome(entry);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  });
  if (result.length === 0) {
    result.push(DEFAULT_HOME);
  }
  return result;
}

function normalizeHome(input: string): string {
  const cleaned = input.replace(/\\/g, '/').trim();
  const stripped = cleaned.replace(/^\/+/, '');
  if (!stripped) return '';
  const segments = stripped
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, '-'));
  const safe = segments.join('/');
  if (safe.includes('..')) return '';
  return safe;
}

async function getSandboxRoot(create: boolean): Promise<FileSystemDirectoryHandle | null> {
  if (typeof navigator === 'undefined') return null;
  const storage = (navigator as any).storage;
  if (!storage?.getDirectory) return null;
  try {
    const root: FileSystemDirectoryHandle = await storage.getDirectory();
    if (create) {
      return root.getDirectoryHandle(SANDBOX_ROOT_DIR, { create: true });
    }
    try {
      return root.getDirectoryHandle(SANDBOX_ROOT_DIR);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

async function ensureSandboxHomes(session: SandboxSession) {
  const base = await getSandboxRoot(true);
  if (!base) return;
  let sandboxDir = await base.getDirectoryHandle(session.id, { create: true });
  for (const home of session.homes) {
    const segments = home.split('/');
    let pointer = sandboxDir;
    for (const segment of segments) {
      pointer = await pointer.getDirectoryHandle(segment, { create: true });
    }
  }
}

async function deleteSandboxDir(session: SandboxSession): Promise<{ removed: boolean; errors: string[] }> {
  const base = await getSandboxRoot(false);
  if (!base) {
    return { removed: false, errors: [] };
  }
  const errors: string[] = [];
  try {
    await (base as any).removeEntry(session.id, { recursive: true });
    return { removed: true, errors };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'sandbox_remove_failed';
    errors.push(message);
  }

  try {
    const sandboxDir = await base.getDirectoryHandle(session.id);
    for (const home of session.homes) {
      const segments = home.split('/').filter(Boolean);
      await removeNestedDirectory(sandboxDir, segments);
    }
    await (base as any).removeEntry(session.id);
    return { removed: true, errors };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'sandbox_remove_failed';
    if (!errors.includes(message)) errors.push(message);
  }

  return { removed: false, errors };
}

async function removeNestedDirectory(
  dir: FileSystemDirectoryHandle,
  segments: string[],
): Promise<void> {
  if (segments.length === 0) return;
  const [head, ...tail] = segments;
  try {
    if (tail.length === 0) {
      await dir.removeEntry(head, { recursive: true } as any);
      return;
    }
    const next = await dir.getDirectoryHandle(head);
    await removeNestedDirectory(next, tail);
    try {
      await dir.removeEntry(head, { recursive: true } as any);
    } catch {
      // ignore cleanup failure for parent directories
    }
  } catch {
    // ignore if the directory cannot be removed
  }
}

function applyNetworkPolicy(policy: NetworkPolicy) {
  appliedPolicy = policy;
}

function resetNetworkPolicy() {
  appliedPolicy = 'allow-all';
}

export function isWindowSandboxed(id: string): boolean {
  return sandboxWindows.has(id);
}

export function markWindowAsSandboxed(id: string) {
  if (!sandboxWindows.has(id)) {
    sandboxWindows.add(id);
    emitSandboxUpdate();
  }
}

export function unmarkWindowAsSandboxed(id: string) {
  if (sandboxWindows.delete(id)) {
    emitSandboxUpdate();
  }
}

export function clearSandboxedWindows() {
  if (sandboxWindows.size > 0) {
    sandboxWindows.clear();
    emitSandboxUpdate();
  }
}

export function getActiveSession(): SandboxSession | null {
  return activeSession;
}

export async function startSandbox(config: SandboxConfig): Promise<SandboxSession> {
  const homes = normalizeHomes(config.homes);
  const policy = NETWORK_POLICIES.find((item) => item.id === config.networkPolicy)?.id ?? 'block-external';
  const label = sanitizeLabel(config.label);
  const id = `${slugifyLabel(label)}-${Math.random().toString(36).slice(2, 8)}`;

  if (activeSession) {
    await cleanupSandbox();
  }

  const session: SandboxSession = {
    id,
    label,
    homes,
    networkPolicy: policy,
    createdAt: Date.now(),
    status: 'running',
  };

  activeSession = session;
  clearSandboxedWindows();
  applyNetworkPolicy(policy);
  await ensureSandboxHomes(session);

  trackEvent('sandbox_start', {
    networkPolicy: policy,
    homeCount: homes.length,
  });

  return session;
}

export async function cleanupSandbox(): Promise<SandboxCleanupResult> {
  const session = activeSession;
  if (!session) {
    return { sessionId: null, removedHomes: [], errors: [], hadStorage: false };
  }

  activeSession = null;
  clearSandboxedWindows();
  resetNetworkPolicy();

  const result: SandboxCleanupResult = {
    sessionId: session.id,
    removedHomes: [...session.homes],
    errors: [],
    hadStorage: false,
  };

  const base = await getSandboxRoot(false);
  if (base) {
    result.hadStorage = true;
    const deletion = await deleteSandboxDir(session);
    if (!deletion.removed) {
      result.errors.push(...deletion.errors);
    } else if (deletion.errors.length) {
      result.errors.push(...deletion.errors);
    }
  }

  trackEvent('sandbox_cleanup', {
    homeCount: result.removedHomes.length,
    hadErrors: result.errors.length > 0,
  });

  if (result.errors.length > 0) {
    trackEvent('sandbox_cleanup_error', { count: result.errors.length });
  }

  return result;
}

export function describeNetworkPolicy(policy: NetworkPolicy): string {
  return (
    NETWORK_POLICIES.find((item) => item.id === policy)?.description ??
    'Applies sandbox network defaults.'
  );
}

export function getCurrentPolicy(): NetworkPolicy {
  return appliedPolicy;
}

