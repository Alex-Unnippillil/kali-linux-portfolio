import { useEffect, useState } from 'react';
import { mergeFlags, readFlags, resetFlags } from '../utils/flags';

export type KillSwitchKey = 'networkAccess';

export interface KillSwitchState {
  networkAccess: boolean;
}

export interface KillSwitchDefinition {
  label: string;
  description: string;
  confirmLabel: string;
  undoLabel: string;
}

export const KILL_SWITCH_DEFAULTS: KillSwitchState = {
  networkAccess: false,
};

export const KILL_SWITCH_DEFINITIONS: Record<KillSwitchKey, KillSwitchDefinition> = {
  networkAccess: {
    label: 'Emergency network kill switch',
    description:
      'Immediately block network-dependent simulations and disable outbound network requests across every open tab.',
    confirmLabel: 'Activate kill switch',
    undoLabel: 'Disable kill switch',
  },
};

type Listener = (state: KillSwitchState) => void;

const listeners = new Set<Listener>();
let cachedState: KillSwitchState | null = null;

const CHANNEL_NAME = 'kill-switch-flags';
const globalScope: any = typeof globalThis !== 'undefined' ? globalThis : {};
const broadcastChannel: BroadcastChannel | null = globalScope.BroadcastChannel
  ? new globalScope.BroadcastChannel(CHANNEL_NAME)
  : null;

function applyDefaults(state?: Partial<KillSwitchState> | null): KillSwitchState {
  return { ...KILL_SWITCH_DEFAULTS, ...(state || {}) };
}

function notify(state: KillSwitchState) {
  listeners.forEach((listener) => listener(state));
}

function handleExternalUpdate(state?: Partial<KillSwitchState> | null) {
  const next = applyDefaults(state);
  cachedState = next;
  notify(next);
}

if (broadcastChannel) {
  broadcastChannel.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'kill-switch:update') {
      handleExternalUpdate(event.data.state as Partial<KillSwitchState>);
    }
  });
}

const serviceWorkerContainer: ServiceWorkerContainer | undefined =
  globalScope.navigator?.serviceWorker;

if (serviceWorkerContainer) {
  serviceWorkerContainer.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as { type?: string; state?: Partial<KillSwitchState> } | undefined;
    if (data && data.type === 'kill-switch:update') {
      handleExternalUpdate(data.state);
    }
  });
}

export async function getKillSwitches(): Promise<KillSwitchState> {
  if (!cachedState) {
    cachedState = await readFlags(KILL_SWITCH_DEFAULTS);
  }
  return cachedState;
}

async function updateState(state: KillSwitchState, broadcast = true) {
  cachedState = state;
  notify(state);
  if (broadcast) {
    broadcastChannel?.postMessage({ type: 'kill-switch:update', state });
  }
  return state;
}

export async function setKillSwitch(flag: KillSwitchKey, active: boolean): Promise<KillSwitchState> {
  const next = await mergeFlags(KILL_SWITCH_DEFAULTS, { [flag]: active } as Partial<KillSwitchState>);
  await updateState(next);
  if (serviceWorkerContainer?.controller) {
    serviceWorkerContainer.controller.postMessage({ type: 'rollback', flags: next });
  }
  return next;
}

export function subscribeToKillSwitches(listener: Listener): () => void {
  listeners.add(listener);
  if (cachedState) {
    listener(cachedState);
  } else {
    void getKillSwitches().then(listener);
  }
  return () => {
    listeners.delete(listener);
  };
}

export function useKillSwitches() {
  const [state, setState] = useState<KillSwitchState>(cachedState || KILL_SWITCH_DEFAULTS);

  useEffect(() => {
    let active = true;
    if (cachedState) {
      setState(cachedState);
    } else {
      getKillSwitches().then((flags) => {
        if (active) setState(flags);
      });
    }
    const unsubscribe = subscribeToKillSwitches((flags) => {
      if (active) setState(flags);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return {
    state,
    setKillSwitch,
  };
}

export async function resetKillSwitches(): Promise<KillSwitchState> {
  const next = await resetFlags(KILL_SWITCH_DEFAULTS);
  return updateState(next, false);
}

export function isKillSwitchActive(state: KillSwitchState, flag: KillSwitchKey): boolean {
  return state[flag];
}
