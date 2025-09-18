import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
const STORAGE_KEY = 'network-profiles';

const readProfiles = (): ProfilesMap => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        return parsed as ProfilesMap;
      }
    }
  } catch {
    // ignore storage access errors and fall back to defaults
  }
  return {};
};

const writeProfiles = (profiles: ProfilesMap) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // ignore persistence errors in restrictive environments
  }
};

export interface NetworkProfile {
  proxyEnabled: boolean;
  proxyUrl: string;
  vpnConnected: boolean;
  vpnLabel: string;
  dnsServers: string[];
  env: Record<string, string>;
}

export interface NetworkProfileContextValue {
  activeWorkspace: string | null;
  profile: NetworkProfile;
  applyWorkspaceProfile: (workspaceId: string) => void;
  updateWorkspaceProfile: (workspaceId: string, updates: Partial<NetworkProfile>) => void;
  getWorkspaceProfile: (workspaceId: string) => NetworkProfile;
  statusToast: string | null;
  clearStatusToast: () => void;
}

export const DEFAULT_NETWORK_PROFILE: NetworkProfile = {
  proxyEnabled: false,
  proxyUrl: '',
  vpnConnected: false,
  vpnLabel: '',
  dnsServers: [],
  env: {},
};

type ProfilesMap = Record<string, NetworkProfile>;

const NetworkProfileContext = createContext<NetworkProfileContextValue | undefined>(undefined);

const sanitizeDns = (dns?: string[]) => {
  if (!dns) return undefined;
  const trimmed = dns.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  return trimmed;
};

const sanitizeEnv = (env?: Record<string, string>) => {
  if (!env) return undefined;
  const next: Record<string, string> = {};
  Object.entries(env).forEach(([key, value]) => {
    const trimmedKey = key.trim();
    if (!trimmedKey) return;
    next[trimmedKey] = value;
  });
  return next;
};

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const envEqual = (a: Record<string, string>, b: Record<string, string>) => {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => b[key] === a[key]);
};

const profilesEqual = (a: NetworkProfile | undefined, b: NetworkProfile) => {
  if (!a) return false;
  return (
    a.proxyEnabled === b.proxyEnabled &&
    a.proxyUrl === b.proxyUrl &&
    a.vpnConnected === b.vpnConnected &&
    a.vpnLabel === b.vpnLabel &&
    arraysEqual(a.dnsServers, b.dnsServers) &&
    envEqual(a.env, b.env)
  );
};

const cloneProfile = (profile: NetworkProfile): NetworkProfile => ({
  proxyEnabled: profile.proxyEnabled,
  proxyUrl: profile.proxyUrl,
  vpnConnected: profile.vpnConnected,
  vpnLabel: profile.vpnLabel,
  dnsServers: [...profile.dnsServers],
  env: { ...profile.env },
});

const computeProfile = (
  current: NetworkProfile | undefined,
  updates?: Partial<NetworkProfile>,
): NetworkProfile => {
  const base = current ? cloneProfile(current) : cloneProfile(DEFAULT_NETWORK_PROFILE);
  const sanitizedDns = sanitizeDns(updates?.dnsServers);
  const sanitizedEnv = sanitizeEnv(updates?.env);
  return {
    proxyEnabled: updates?.proxyEnabled ?? base.proxyEnabled,
    proxyUrl: (updates?.proxyUrl ?? base.proxyUrl).trim(),
    vpnConnected: updates?.vpnConnected ?? base.vpnConnected,
    vpnLabel: (updates?.vpnLabel ?? base.vpnLabel).trim(),
    dnsServers: sanitizedDns ?? base.dnsServers,
    env: sanitizedEnv ?? base.env,
  };
};

const broadcastProfile = (workspaceId: string, profile: NetworkProfile) => {
  if (typeof window === 'undefined') return;
  const detail = { workspaceId, profile };
  window.dispatchEvent(new CustomEvent('network-profile-applied', { detail }));
  window.dispatchEvent(
    new CustomEvent('network-proxy-updated', {
      detail: {
        workspaceId,
        proxyEnabled: profile.proxyEnabled,
        proxyUrl: profile.proxyUrl,
      },
    }),
  );
};

interface ActiveState {
  activeWorkspace: string | null;
  profile: NetworkProfile;
  statusToast: string | null;
}

export function NetworkProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<ProfilesMap>(() => readProfiles());
  useEffect(() => {
    writeProfiles(profiles);
  }, [profiles]);
  const [activeState, setActiveState] = useState<ActiveState>({
    activeWorkspace: null,
    profile: cloneProfile(DEFAULT_NETWORK_PROFILE),
    statusToast: null,
  });
  const activeWorkspaceRef = useRef<string | null>(null);

  useEffect(() => {
    activeWorkspaceRef.current = activeState.activeWorkspace;
  }, [activeState.activeWorkspace]);

  const ensureProfile = useCallback(
    (workspaceId: string, updates?: Partial<NetworkProfile>) => {
      let nextProfile = computeProfile(profiles[workspaceId], updates);
      setProfiles((prev) => {
        const computed = computeProfile(prev[workspaceId], updates);
        nextProfile = computed;
        if (profilesEqual(prev[workspaceId], computed)) {
          return prev;
        }
        return { ...prev, [workspaceId]: computed };
      });
      return nextProfile;
    },
    [profiles, setProfiles],
  );

  const applyWorkspaceProfile = useCallback(
    (workspaceId: string) => {
      const profile = ensureProfile(workspaceId);
      setActiveState({
        activeWorkspace: workspaceId,
        profile,
        statusToast: `Applied ${workspaceId} network profile${
          profile.vpnConnected ? ' (VPN on)' : ''
        }`,
      });
      broadcastProfile(workspaceId, profile);
    },
    [ensureProfile],
  );

  const updateWorkspaceProfile = useCallback(
    (workspaceId: string, updates: Partial<NetworkProfile>) => {
      const profile = ensureProfile(workspaceId, updates);
      setActiveState((prev) => {
        if (prev.activeWorkspace !== workspaceId) return prev;
        return {
          activeWorkspace: workspaceId,
          profile,
          statusToast: `Updated ${workspaceId} network profile`,
        };
      });
      if (activeWorkspaceRef.current === workspaceId) {
        broadcastProfile(workspaceId, profile);
      }
    },
    [ensureProfile],
  );

  const getWorkspaceProfile = useCallback(
    (workspaceId: string): NetworkProfile => {
      const stored = profiles[workspaceId];
      if (stored) {
        return cloneProfile(stored);
      }
      return cloneProfile(DEFAULT_NETWORK_PROFILE);
    },
    [profiles],
  );

  const clearStatusToast = useCallback(() => {
    setActiveState((prev) => (prev.statusToast ? { ...prev, statusToast: null } : prev));
  }, []);

  const { activeWorkspace, profile, statusToast } = activeState;

  const value = useMemo(
    () => ({
      activeWorkspace,
      profile,
      applyWorkspaceProfile,
      updateWorkspaceProfile,
      getWorkspaceProfile,
      statusToast,
      clearStatusToast,
    }),
    [
      activeWorkspace,
      profile,
      applyWorkspaceProfile,
      updateWorkspaceProfile,
      getWorkspaceProfile,
      statusToast,
      clearStatusToast,
    ],
  );

  return (
    <NetworkProfileContext.Provider value={value}>{children}</NetworkProfileContext.Provider>
  );
}

export function useNetworkProfile() {
  const ctx = useContext(NetworkProfileContext);
  if (!ctx) {
    throw new Error('useNetworkProfile must be used within NetworkProfileProvider');
  }
  return ctx;
}
