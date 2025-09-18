import { createEncryptedStore } from './encryptedStore';
import type { OpenVpnConfig, WireGuardConfig, VpnProfileType } from './vpnParser';

export interface LeakTestEntry {
  id: string;
  timestamp: string;
  ip: string;
  targetIp: string;
  leaking: boolean;
  dnsLeaking: boolean;
  webRtcLeaking: boolean;
}

export interface StoredVpnProfile {
  id: string;
  name: string;
  type: VpnProfileType;
  createdAt: string;
  updatedAt: string;
  lastConnectedAt?: string;
  autoConnect?: boolean;
  favourite?: boolean;
  notes?: string;
  leakTests: LeakTestEntry[];
  openVpn?: OpenVpnConfig;
  wireGuard?: WireGuardConfig;
}

const store = createEncryptedStore<StoredVpnProfile[]>(
  'vpn-manager/profiles',
  [],
);

export const loadProfiles = (): Promise<StoredVpnProfile[]> => store.load();

export const saveProfiles = (profiles: StoredVpnProfile[]): Promise<void> =>
  store.save(profiles);

export const clearProfiles = (): Promise<void> => store.clear();

const vpnStorage = {
  loadProfiles,
  saveProfiles,
  clearProfiles,
};

export default vpnStorage;
