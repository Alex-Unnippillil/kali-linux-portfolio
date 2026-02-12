"use client";

import { useEffect, useMemo, useState } from 'react';
import { getDb } from '../utils/safeIDB';

const DB_NAME = 'proxy-profiles';
const DB_VERSION = 1;
const STORE_NAME = 'state';
const STORE_KEY = 'profiles';
const STATE_VERSION = 1;

export const PROXY_PROFILES_EVENT = 'proxy-profiles-change';

export type ProxyProtocol =
  | 'http'
  | 'https'
  | 'socks4'
  | 'socks5'
  | 'ssh'
  | 'tor'
  | 'custom';

const VALID_PROTOCOLS: ProxyProtocol[] = [
  'http',
  'https',
  'socks4',
  'socks5',
  'ssh',
  'tor',
  'custom',
];

export type ProxyHealthStatus = 'unknown' | 'online' | 'degraded' | 'offline';

const VALID_HEALTH_STATUSES: ProxyHealthStatus[] = [
  'unknown',
  'online',
  'degraded',
  'offline',
];

type HealthStatusInput = ProxyHealthStatus | string | undefined;

function sanitizeProtocol(protocol: string | undefined): ProxyProtocol {
  if (protocol && VALID_PROTOCOLS.includes(protocol as ProxyProtocol)) {
    return protocol as ProxyProtocol;
  }
  return 'custom';
}

function sanitizeHealthStatus(status: HealthStatusInput): ProxyHealthStatus {
  if (status && VALID_HEALTH_STATUSES.includes(status as ProxyHealthStatus)) {
    return status as ProxyHealthStatus;
  }
  return 'unknown';
}

export interface ProxyCredentials {
  username?: string;
  password?: string;
}

export interface ProxyHealth {
  status: ProxyHealthStatus;
  latencyMs?: number;
  checkedAt?: number;
  lastError?: string;
}

export interface ProxyNode {
  id: string;
  name: string;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  credentials?: ProxyCredentials;
  health: ProxyHealth;
  notes?: string;
}

export type ProxyNodeInput = Omit<ProxyNode, 'id' | 'health'> & {
  id?: string;
  health?: Partial<ProxyHealth>;
};

export interface ProxyChain {
  id: string;
  name: string;
  description?: string;
  nodeIds: string[];
  strategy: 'cascade' | 'failover' | 'load-balance';
  createdAt: number;
  updatedAt: number;
}

export type ProxyChainInput = Omit<ProxyChain, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export interface AppProxyOverride {
  chainId: string;
  lastUpdated: number;
}

export interface SystemProxyState {
  activeChainId: string | null;
  fallbackChainIds: string[];
  bypassHosts: string[];
  lastSwitchedAt: number | null;
}

export interface ProxyProfilesState {
  version: number;
  updatedAt: number | null;
  nodes: Record<string, ProxyNode>;
  chains: Record<string, ProxyChain>;
  system: SystemProxyState;
  overrides: Record<string, AppProxyOverride>;
}

export type ProxyProfilesChangeReason =
  | { type: 'node'; id: string }
  | { type: 'chain'; id: string }
  | { type: 'system'; activeChainId: string | null }
  | { type: 'override'; appId: string };

export interface ProxyProfilesChangeEventDetail {
  state: ProxyProfilesState;
  reason?: ProxyProfilesChangeReason;
}

export type ProxyProfilesListener = (
  state: ProxyProfilesState,
  reason?: ProxyProfilesChangeReason,
) => void;

const defaultState: ProxyProfilesState = {
  version: STATE_VERSION,
  updatedAt: null,
  nodes: {},
  chains: {},
  system: {
    activeChainId: null,
    fallbackChainIds: [],
    bypassHosts: [],
    lastSwitchedAt: null,
  },
  overrides: {},
};

let state: ProxyProfilesState = { ...defaultState };
let initialized = false;
let initPromise: Promise<ProxyProfilesState> | null = null;

const listeners = new Set<ProxyProfilesListener>();

let dbPromise: ReturnType<typeof getDb> | null = null;
function openDb() {
  if (!dbPromise) {
    dbPromise = getDb(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

function deepCloneState(value: ProxyProfilesState): ProxyProfilesState {
  const nodes: Record<string, ProxyNode> = {};
  Object.entries(value.nodes).forEach(([id, node]) => {
    nodes[id] = {
      ...node,
      credentials: node.credentials
        ? { ...node.credentials }
        : undefined,
      health: { ...node.health },
      notes: node.notes,
    };
  });
  const chains: Record<string, ProxyChain> = {};
  Object.entries(value.chains).forEach(([id, chain]) => {
    chains[id] = {
      ...chain,
      nodeIds: [...chain.nodeIds],
    };
  });
  const overrides: Record<string, AppProxyOverride> = {};
  Object.entries(value.overrides).forEach(([appId, override]) => {
    overrides[appId] = { ...override };
  });
  return {
    ...value,
    nodes,
    chains,
    overrides,
    system: {
      ...value.system,
      fallbackChainIds: [...value.system.fallbackChainIds],
      bypassHosts: [...value.system.bypassHosts],
    },
  };
}

function notify(reason?: ProxyProfilesChangeReason) {
  listeners.forEach((listener) => listener(deepCloneState(state), reason));
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(
      new CustomEvent<ProxyProfilesChangeEventDetail>(PROXY_PROFILES_EVENT, {
        detail: {
          state: deepCloneState(state),
          reason,
        },
      }),
    );
  }
}

async function persistState(next: ProxyProfilesState) {
  try {
    const dbp = openDb();
    if (!dbp) return;
    const db = await dbp;
    await db.put(STORE_NAME, next, STORE_KEY);
  } catch (error) {
    console.error('Failed to persist proxy profiles', error);
  }
}

async function readPersistedState(): Promise<ProxyProfilesState | null> {
  try {
    const dbp = openDb();
    if (!dbp) return null;
    const db = await dbp;
    const stored = await db.get(STORE_NAME, STORE_KEY);
    if (!stored) return null;
    return normalizeState(stored);
  } catch (error) {
    console.error('Failed to read proxy profiles', error);
    return null;
  }
}

function normalizeNode(id: string, value: any): ProxyNode | null {
  if (!value || typeof value !== 'object') return null;
  const host = typeof value.host === 'string' ? value.host : '';
  const port = typeof value.port === 'number' ? value.port : Number(value.port);
  if (!host || !Number.isFinite(port)) return null;
  const protocol = sanitizeProtocol(value.protocol);
  const credentials =
    value.credentials && typeof value.credentials === 'object'
      ? {
          username:
            typeof value.credentials.username === 'string'
              ? value.credentials.username
              : undefined,
          password:
            typeof value.credentials.password === 'string'
              ? value.credentials.password
              : undefined,
        }
      : undefined;
  const health: ProxyHealth = {
    status: sanitizeHealthStatus(value.health?.status),
    latencyMs:
      typeof value.health?.latencyMs === 'number'
        ? value.health.latencyMs
        : undefined,
    checkedAt:
      typeof value.health?.checkedAt === 'number'
        ? value.health.checkedAt
        : undefined,
    lastError:
      typeof value.health?.lastError === 'string'
        ? value.health.lastError
        : undefined,
  };
  if (!health.checkedAt && health.status !== 'unknown') {
    health.checkedAt = Date.now();
  }
  return {
    id,
    name: typeof value.name === 'string' ? value.name : `${protocol.toUpperCase()} ${host}:${port}`,
    protocol,
    host,
    port,
    credentials,
    health,
    notes: typeof value.notes === 'string' ? value.notes : undefined,
  };
}

function normalizeChain(id: string, value: any, nodes: Record<string, ProxyNode>): ProxyChain | null {
  if (!value || typeof value !== 'object') return null;
  const nodeIds = Array.isArray(value.nodeIds)
    ? (value.nodeIds.filter((nodeId: unknown) => typeof nodeId === 'string' && nodes[nodeId]) as string[])
    : [];
  const strategy: ProxyChain['strategy'] =
    value.strategy === 'failover' || value.strategy === 'load-balance'
      ? value.strategy
      : 'cascade';
  const createdAt =
    typeof value.createdAt === 'number' ? value.createdAt : Date.now();
  const updatedAt =
    typeof value.updatedAt === 'number' ? value.updatedAt : createdAt;
  return {
    id,
    name: typeof value.name === 'string' ? value.name : `Chain ${id}`,
    description:
      typeof value.description === 'string' ? value.description : undefined,
    nodeIds,
    strategy,
    createdAt,
    updatedAt,
  };
}

function normalizeState(raw: any): ProxyProfilesState {
  if (!raw || typeof raw !== 'object') {
    return deepCloneState(defaultState);
  }
  const nodes: Record<string, ProxyNode> = {};
  if (raw.nodes && typeof raw.nodes === 'object') {
    Object.entries(raw.nodes as Record<string, unknown>).forEach(([id, value]) => {
      if (typeof id === 'string') {
        const node = normalizeNode(id, value);
        if (node) {
          nodes[id] = node;
        }
      }
    });
  }
  const chains: Record<string, ProxyChain> = {};
  if (raw.chains && typeof raw.chains === 'object') {
    Object.entries(raw.chains as Record<string, unknown>).forEach(([id, value]) => {
      if (typeof id === 'string') {
        const chain = normalizeChain(id, value, nodes);
        if (chain) {
          chains[id] = chain;
        }
      }
    });
  }
  const overrides: Record<string, AppProxyOverride> = {};
  if (raw.overrides && typeof raw.overrides === 'object') {
    Object.entries(raw.overrides as Record<string, any>).forEach(([appId, value]) => {
      if (
        typeof appId === 'string' &&
        value &&
        typeof value === 'object' &&
        typeof value.chainId === 'string'
      ) {
        overrides[appId] = {
          chainId: value.chainId,
          lastUpdated:
            typeof value.lastUpdated === 'number'
              ? value.lastUpdated
              : Date.now(),
        };
      }
    });
  }
  const system: SystemProxyState = {
    activeChainId:
      typeof raw.system?.activeChainId === 'string'
        ? raw.system.activeChainId
        : null,
    fallbackChainIds: Array.isArray(raw.system?.fallbackChainIds)
      ? (raw.system.fallbackChainIds.filter(
          (id: unknown) => typeof id === 'string' && chains[id],
        ) as string[])
      : [],
    bypassHosts: Array.isArray(raw.system?.bypassHosts)
      ? (raw.system.bypassHosts.filter((host: unknown) => typeof host === 'string') as string[])
      : [],
    lastSwitchedAt:
      typeof raw.system?.lastSwitchedAt === 'number'
        ? raw.system.lastSwitchedAt
        : null,
  };
  if (system.activeChainId && !chains[system.activeChainId]) {
    system.activeChainId = null;
  }
  return {
    version: STATE_VERSION,
    updatedAt:
      typeof raw.updatedAt === 'number' ? raw.updatedAt : null,
    nodes,
    chains,
    overrides,
    system,
  };
}

async function loadState(force = false): Promise<ProxyProfilesState> {
  if (initialized && !force) {
    return state;
  }
  if (!initPromise || force) {
    initPromise = (async () => {
      try {
        const stored = await readPersistedState();
        if (stored) {
          state = stored;
        } else if (!initialized) {
          await persistState(state);
        }
      } catch (error) {
        console.error('Failed to load proxy profiles', error);
      } finally {
        initialized = true;
      }
      return state;
    })();
  }
  return initPromise;
}

function finalizeState(next: ProxyProfilesState): ProxyProfilesState {
  return {
    ...next,
    version: STATE_VERSION,
    updatedAt: Date.now(),
  };
}

async function mutateState(
  updater: (current: ProxyProfilesState) => ProxyProfilesState,
  reason?: ProxyProfilesChangeReason | ((next: ProxyProfilesState) => ProxyProfilesChangeReason | undefined),
): Promise<ProxyProfilesState> {
  await loadState();
  const next = finalizeState(updater(deepCloneState(state)));
  state = next;
  const computedReason =
    typeof reason === 'function' ? reason(next) : reason;
  notify(computedReason);
  await persistState(next);
  return next;
}

function createId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `proxy-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function upsertProxyNode(node: ProxyNodeInput): Promise<ProxyNode> {
  if (!node || typeof node !== 'object') {
    throw new Error('Invalid proxy node payload');
  }
  if (typeof node.host !== 'string' || !node.host) {
    throw new Error('Proxy node host is required');
  }
  if (typeof node.port !== 'number' || !Number.isFinite(node.port)) {
    throw new Error('Proxy node port must be a number');
  }
  if (typeof node.protocol !== 'string') {
    throw new Error('Proxy node protocol is required');
  }
  const id = node.id ?? createId();
  let result: ProxyNode;
  await mutateState(
    (current) => {
      const existing = current.nodes[id];
      const protocol = sanitizeProtocol(node.protocol ?? existing?.protocol);
      const health: ProxyHealth = {
        status: sanitizeHealthStatus(node.health?.status ?? existing?.health.status),
        latencyMs:
          node.health?.latencyMs ?? existing?.health.latencyMs,
        checkedAt:
          node.health?.checkedAt ?? existing?.health.checkedAt ?? Date.now(),
        lastError:
          node.health?.lastError ?? existing?.health.lastError,
      };
      result = {
        id,
        name:
          typeof node.name === 'string'
            ? node.name
            : existing?.name ?? `${protocol.toUpperCase()} ${node.host}:${node.port}`,
        protocol,
        host: node.host,
        port: node.port,
        credentials:
          node.credentials !== undefined
            ? node.credentials
            : existing?.credentials,
        health,
        notes:
          node.notes !== undefined ? node.notes : existing?.notes,
      };
      return {
        ...current,
        nodes: {
          ...current.nodes,
          [id]: result!,
        },
      };
    },
    () => ({ type: 'node', id }),
  );
  return result!;
}

export async function recordProxyHealth(
  nodeId: string,
  update: Partial<ProxyHealth>,
): Promise<void> {
  await mutateState(
    (current) => {
      const existing = current.nodes[nodeId];
      if (!existing) return current;
      const nextHealth: ProxyHealth = {
        status: sanitizeHealthStatus(update.status ?? existing.health.status),
        latencyMs: update.latencyMs ?? existing.health.latencyMs,
        checkedAt: update.checkedAt ?? Date.now(),
        lastError: update.lastError ?? existing.health.lastError,
      };
      return {
        ...current,
        nodes: {
          ...current.nodes,
          [nodeId]: {
            ...existing,
            health: nextHealth,
          },
        },
      };
    },
    { type: 'node', id: nodeId },
  );
}

export async function removeProxyNode(nodeId: string): Promise<void> {
  await mutateState(
    (current) => {
      if (!current.nodes[nodeId]) return current;
      const nodes = { ...current.nodes };
      delete nodes[nodeId];
      const chains: Record<string, ProxyChain> = {};
      const removedChainIds: string[] = [];
      Object.entries(current.chains).forEach(([id, chain]) => {
        const filtered = chain.nodeIds.filter((nid) => nid !== nodeId);
        if (filtered.length === 0) {
          removedChainIds.push(id);
          return;
        }
        if (filtered.length === chain.nodeIds.length) {
          chains[id] = chain;
        } else {
          chains[id] = {
            ...chain,
            nodeIds: filtered,
            updatedAt: Date.now(),
          };
        }
      });
      const overrides: Record<string, AppProxyOverride> = {};
      Object.entries(current.overrides).forEach(([appId, override]) => {
        if (!removedChainIds.includes(override.chainId)) {
          overrides[appId] = override;
        }
      });
      const activeRemoved =
        current.system.activeChainId !== null &&
        removedChainIds.includes(current.system.activeChainId);
      return {
        ...current,
        nodes,
        chains,
        overrides,
        system: {
          ...current.system,
          activeChainId: activeRemoved ? null : current.system.activeChainId,
          fallbackChainIds: current.system.fallbackChainIds.filter(
            (id) => !removedChainIds.includes(id),
          ),
        },
      };
    },
    { type: 'node', id: nodeId },
  );
}

export async function upsertProxyChain(chain: ProxyChainInput): Promise<ProxyChain> {
  if (!chain || typeof chain !== 'object') {
    throw new Error('Invalid proxy chain payload');
  }
  const id = chain.id ?? createId();
  let result: ProxyChain;
  await mutateState(
    (current) => {
      const existing = current.chains[id];
      const nodeIdsSource =
        chain.nodeIds ?? existing?.nodeIds ?? [];
      const nodeIds = nodeIdsSource.filter((nodeId) => current.nodes[nodeId]);
      const now = Date.now();
      const strategy: ProxyChain['strategy'] =
        chain.strategy === 'failover' || chain.strategy === 'load-balance'
          ? chain.strategy
          : existing?.strategy ?? 'cascade';
      result = {
        id,
        name:
          typeof chain.name === 'string'
            ? chain.name
            : existing?.name ?? `Chain ${id}`,
        description:
          chain.description !== undefined
            ? chain.description
            : existing?.description,
        nodeIds,
        strategy,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      return {
        ...current,
        chains: {
          ...current.chains,
          [id]: result!,
        },
      };
    },
    { type: 'chain', id },
  );
  return result!;
}

export async function removeProxyChain(chainId: string): Promise<void> {
  await mutateState(
    (current) => {
      if (!current.chains[chainId]) return current;
      const chains = { ...current.chains };
      delete chains[chainId];
      const overrides: Record<string, AppProxyOverride> = {};
      Object.entries(current.overrides).forEach(([appId, override]) => {
        if (override.chainId !== chainId) {
          overrides[appId] = override;
        }
      });
      const isActive = current.system.activeChainId === chainId;
      return {
        ...current,
        chains,
        overrides,
        system: {
          ...current.system,
          activeChainId: isActive ? null : current.system.activeChainId,
          fallbackChainIds: current.system.fallbackChainIds.filter((id) => id !== chainId),
        },
      };
    },
    { type: 'chain', id: chainId },
  );
}

export async function setAppProxyOverride(
  appId: string,
  chainId: string,
): Promise<void> {
  if (!appId) throw new Error('App id is required');
  if (!chainId) throw new Error('Chain id is required');
  await mutateState(
    (current) => {
      return {
        ...current,
        overrides: {
          ...current.overrides,
          [appId]: {
            chainId,
            lastUpdated: Date.now(),
          },
        },
      };
    },
    { type: 'override', appId },
  );
}

export async function clearAppProxyOverride(appId: string): Promise<void> {
  await mutateState(
    (current) => {
      if (!current.overrides[appId]) return current;
      const overrides = { ...current.overrides };
      delete overrides[appId];
      return {
        ...current,
        overrides,
      };
    },
    { type: 'override', appId },
  );
}

export async function updateSystemProxy(
  patch: Partial<Omit<SystemProxyState, 'lastSwitchedAt'>> & {
    activeChainId?: string | null;
  },
): Promise<void> {
  await mutateState(
    (current) => {
      const nextActive =
        patch.activeChainId !== undefined
          ? patch.activeChainId
          : current.system.activeChainId;
      const activeChanged = patch.activeChainId !== undefined && nextActive !== current.system.activeChainId;
      return {
        ...current,
        system: {
          activeChainId: nextActive ?? null,
          fallbackChainIds:
            patch.fallbackChainIds !== undefined
              ? patch.fallbackChainIds.filter((id): id is string => typeof id === 'string')
              : current.system.fallbackChainIds,
          bypassHosts:
            patch.bypassHosts !== undefined
              ? patch.bypassHosts.filter((host): host is string => typeof host === 'string')
              : current.system.bypassHosts,
          lastSwitchedAt: activeChanged ? Date.now() : current.system.lastSwitchedAt,
        },
      };
    },
    (next) => ({ type: 'system', activeChainId: next.system.activeChainId }),
  );
}

export async function refreshProxyProfiles(): Promise<ProxyProfilesState> {
  await loadState(true);
  notify();
  return deepCloneState(state);
}

export function getProxyProfilesSnapshot(): ProxyProfilesState {
  return deepCloneState(state);
}

export function subscribeToProxyProfiles(listener: ProxyProfilesListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useProxyProfiles() {
  const [current, setCurrent] = useState<ProxyProfilesState>(() => deepCloneState(state));
  const [loading, setLoading] = useState<boolean>(() => !initialized);

  useEffect(() => {
    let active = true;
    loadState().then((loaded) => {
      if (!active) return;
      setCurrent(deepCloneState(loaded));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToProxyProfiles((next) => {
      setCurrent(next);
    });
    return unsubscribe;
  }, []);

  const actions = useMemo(
    () => ({
      upsertNode: upsertProxyNode,
      removeNode: removeProxyNode,
      upsertChain: upsertProxyChain,
      removeChain: removeProxyChain,
      setAppOverride: setAppProxyOverride,
      clearAppOverride: clearAppProxyOverride,
      updateSystem: updateSystemProxy,
      recordHealth: recordProxyHealth,
      refresh: refreshProxyProfiles,
    }),
    [],
  );

  return {
    loading,
    state: current,
    nodes: current.nodes,
    chains: current.chains,
    system: current.system,
    overrides: current.overrides,
    ...actions,
  } as const;
}

