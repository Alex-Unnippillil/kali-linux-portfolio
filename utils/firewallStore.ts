import { safeLocalStorage } from './safeStorage';

export type FirewallProfile = 'home' | 'work' | 'public';
export type FirewallProtocol = 'TCP' | 'UDP' | 'Any';
export type FirewallAction = 'allow' | 'block';

export interface FirewallRule {
  id: string;
  app: string;
  port: string;
  protocol: FirewallProtocol;
  action: FirewallAction;
}

export type FirewallRuleInput = Omit<FirewallRule, 'id'>;

export interface FirewallState {
  activeProfile: FirewallProfile;
  profiles: Record<FirewallProfile, FirewallRule[]>;
}

export const FIREWALL_PROFILES: readonly FirewallProfile[] = [
  'home',
  'work',
  'public',
] as const;

export const FIREWALL_PROTOCOLS: readonly FirewallProtocol[] = [
  'TCP',
  'UDP',
  'Any',
] as const;

export const FIREWALL_ACTIONS: readonly FirewallAction[] = [
  'allow',
  'block',
] as const;

const STORAGE_KEY = 'firewall-state-v1';

const DEFAULT_STATE: FirewallState = {
  activeProfile: 'home',
  profiles: {
    home: [
      {
        id: 'home-allow-http',
        app: 'Web Browser',
        port: '80',
        protocol: 'TCP',
        action: 'allow',
      },
      {
        id: 'home-allow-https',
        app: 'Web Browser',
        port: '443',
        protocol: 'TCP',
        action: 'allow',
      },
      {
        id: 'home-block-inbound',
        app: 'Unknown Inbound',
        port: 'Any',
        protocol: 'Any',
        action: 'block',
      },
    ],
    work: [
      {
        id: 'work-allow-vpn',
        app: 'VPN Client',
        port: '1194',
        protocol: 'UDP',
        action: 'allow',
      },
      {
        id: 'work-allow-rdp',
        app: 'Remote Desktop',
        port: '3389',
        protocol: 'TCP',
        action: 'allow',
      },
      {
        id: 'work-block-filesharing',
        app: 'Unauthorized File Sharing',
        port: 'Any',
        protocol: 'Any',
        action: 'block',
      },
    ],
    public: [
      {
        id: 'public-allow-https',
        app: 'Web Browser',
        port: '443',
        protocol: 'TCP',
        action: 'allow',
      },
      {
        id: 'public-block-filesharing',
        app: 'File Sharing Tools',
        port: 'Any',
        protocol: 'Any',
        action: 'block',
      },
      {
        id: 'public-block-remote',
        app: 'Remote Management',
        port: '3389',
        protocol: 'TCP',
        action: 'block',
      },
    ],
  },
};

let state: FirewallState = loadInitialState();

function loadInitialState(): FirewallState {
  const fallback = cloneState(DEFAULT_STATE);
  if (!safeLocalStorage) {
    return fallback;
  }
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw) as Partial<FirewallState> | undefined;
    const activeProfile = isValidProfile(parsed?.activeProfile)
      ? parsed!.activeProfile
      : fallback.activeProfile;
    const profiles = ensureProfiles(parsed?.profiles);
    return {
      activeProfile,
      profiles,
    };
  } catch {
    return fallback;
  }
}

function isValidProfile(profile: unknown): profile is FirewallProfile {
  return typeof profile === 'string' && FIREWALL_PROFILES.includes(profile as FirewallProfile);
}

function cloneRules(rules: FirewallRule[]): FirewallRule[] {
  return rules.map((rule) => ({ ...rule }));
}

function cloneState(input: FirewallState): FirewallState {
  return {
    activeProfile: input.activeProfile,
    profiles: {
      home: cloneRules(input.profiles.home),
      work: cloneRules(input.profiles.work),
      public: cloneRules(input.profiles.public),
    },
  };
}

function ensureProfiles(
  profiles: Partial<Record<string, unknown>> | undefined
): Record<FirewallProfile, FirewallRule[]> {
  const record: Partial<Record<string, unknown>> = profiles && typeof profiles === 'object' ? profiles : {};
  const result: Record<FirewallProfile, FirewallRule[]> = {
    home: [],
    work: [],
    public: [],
  };
  for (const profile of FIREWALL_PROFILES) {
    const maybeRules = record[profile];
    if (Array.isArray(maybeRules)) {
      const normalised = maybeRules
        .map((rule) => normaliseRule(rule))
        .filter((rule): rule is FirewallRule => Boolean(rule));
      result[profile] = normalised.length > 0 ? normalised : cloneRules(DEFAULT_STATE.profiles[profile]);
    } else {
      result[profile] = cloneRules(DEFAULT_STATE.profiles[profile]);
    }
  }
  return result;
}

function normaliseRule(rule: unknown): FirewallRule | null {
  if (!rule || typeof rule !== 'object') {
    return null;
  }
  const data = rule as Partial<Record<keyof FirewallRule, unknown>>;
  const id = typeof data.id === 'string' && data.id.trim() ? data.id.trim() : createRuleId();
  const app = typeof data.app === 'string' ? data.app : '';
  const port = typeof data.port === 'string' ? data.port : '';
  const protocol = FIREWALL_PROTOCOLS.includes(data.protocol as FirewallProtocol)
    ? (data.protocol as FirewallProtocol)
    : 'Any';
  const action = FIREWALL_ACTIONS.includes(data.action as FirewallAction)
    ? (data.action as FirewallAction)
    : 'allow';
  return {
    id,
    app: sanitiseText(app, 'Any Application'),
    port: sanitiseText(port, 'Any'),
    protocol,
    action,
  };
}

function createRuleId(): string {
  if (typeof globalThis !== 'undefined') {
    const { crypto } = globalThis as typeof globalThis & { crypto?: Crypto };
    if (crypto && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  }
  return `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitiseText(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function createRuleFromInput(input: FirewallRuleInput, id?: string): FirewallRule {
  return {
    id: id ?? createRuleId(),
    app: sanitiseText(input.app, 'Any Application'),
    port: sanitiseText(input.port, 'Any'),
    protocol: FIREWALL_PROTOCOLS.includes(input.protocol) ? input.protocol : 'Any',
    action: FIREWALL_ACTIONS.includes(input.action) ? input.action : 'allow',
  };
}

function persistState(): void {
  if (!safeLocalStorage) {
    return;
  }
  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore persistence errors (storage full, disabled, etc.)
  }
}

function applyState(next: FirewallState): FirewallState {
  state = cloneState(next);
  persistState();
  return getFirewallState();
}

export function getFirewallState(): FirewallState {
  return cloneState(state);
}

export function setActiveProfile(profile: FirewallProfile): FirewallState {
  if (state.activeProfile === profile) {
    return getFirewallState();
  }
  return applyState({
    activeProfile: profile,
    profiles: state.profiles,
  });
}

export function addRule(profile: FirewallProfile, input: FirewallRuleInput): FirewallState {
  const rule = createRuleFromInput(input);
  const nextProfiles: FirewallState['profiles'] = {
    ...state.profiles,
    [profile]: [...state.profiles[profile], rule],
  } as FirewallState['profiles'];
  return applyState({
    activeProfile: state.activeProfile,
    profiles: nextProfiles,
  });
}

export function updateRule(
  profile: FirewallProfile,
  id: string,
  input: FirewallRuleInput
): FirewallState {
  const currentRules = state.profiles[profile];
  const index = currentRules.findIndex((rule) => rule.id === id);
  if (index === -1) {
    return getFirewallState();
  }
  const updatedRule = createRuleFromInput(input, currentRules[index].id);
  const nextRules = [...currentRules];
  nextRules[index] = updatedRule;
  const nextProfiles: FirewallState['profiles'] = {
    ...state.profiles,
    [profile]: nextRules,
  } as FirewallState['profiles'];
  return applyState({
    activeProfile: state.activeProfile,
    profiles: nextProfiles,
  });
}

export function removeRule(profile: FirewallProfile, id: string): FirewallState {
  const currentRules = state.profiles[profile];
  const nextRules = currentRules.filter((rule) => rule.id !== id);
  const finalRules = nextRules.length > 0 ? nextRules : cloneRules(DEFAULT_STATE.profiles[profile]);
  const nextProfiles: FirewallState['profiles'] = {
    ...state.profiles,
    [profile]: finalRules,
  } as FirewallState['profiles'];
  return applyState({
    activeProfile: state.activeProfile,
    profiles: nextProfiles,
  });
}

export function resetFirewallState(): FirewallState {
  if (safeLocalStorage) {
    try {
      safeLocalStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  return applyState(DEFAULT_STATE);
}
