import { Dispatch, SetStateAction } from 'react';
import usePersistentState from './usePersistentState';

export type SimulationStatus = 'idle' | 'running' | 'complete';
export type VerificationStatus = 'idle' | 'pending' | 'running' | 'failed' | 'success';

export interface LiveInstallerState {
  step: number;
  selectedDeviceId: string | null;
  persistenceSize: number;
  filesystem: string;
  simulationStatus: SimulationStatus;
  partitionProgress: number;
  persistenceProgress: number;
  verificationStatus: VerificationStatus;
  verificationAttempts: number;
  lastVerificationError: string | null;
}

export const LIVE_INSTALLER_STORAGE_KEY = 'live-installer-state';
export const DEFAULT_DEVICE_ID = 'portable-ssd';

export const defaultLiveInstallerState: LiveInstallerState = {
  step: 0,
  selectedDeviceId: DEFAULT_DEVICE_ID,
  persistenceSize: 8,
  filesystem: 'ext4',
  simulationStatus: 'idle',
  partitionProgress: 0,
  persistenceProgress: 0,
  verificationStatus: 'idle',
  verificationAttempts: 0,
  lastVerificationError: null,
};

const simulationStatuses: SimulationStatus[] = ['idle', 'running', 'complete'];
const verificationStatuses: VerificationStatus[] = [
  'idle',
  'pending',
  'running',
  'failed',
  'success',
];

export const isLiveInstallerState = (
  value: unknown,
): value is LiveInstallerState => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<LiveInstallerState>;
  return (
    typeof candidate.step === 'number' &&
    Number.isFinite(candidate.step) &&
    candidate.step >= 0 &&
    candidate.step <= 4 &&
    (candidate.selectedDeviceId === null || typeof candidate.selectedDeviceId === 'string') &&
    typeof candidate.persistenceSize === 'number' &&
    Number.isFinite(candidate.persistenceSize) &&
    candidate.persistenceSize >= 0 &&
    typeof candidate.filesystem === 'string' &&
    typeof candidate.partitionProgress === 'number' &&
    Number.isFinite(candidate.partitionProgress) &&
    candidate.partitionProgress >= 0 &&
    candidate.partitionProgress <= 100 &&
    typeof candidate.persistenceProgress === 'number' &&
    Number.isFinite(candidate.persistenceProgress) &&
    candidate.persistenceProgress >= 0 &&
    candidate.persistenceProgress <= 100 &&
    typeof candidate.simulationStatus === 'string' &&
    simulationStatuses.includes(candidate.simulationStatus as SimulationStatus) &&
    typeof candidate.verificationStatus === 'string' &&
    verificationStatuses.includes(candidate.verificationStatus as VerificationStatus) &&
    typeof candidate.verificationAttempts === 'number' &&
    Number.isFinite(candidate.verificationAttempts) &&
    candidate.verificationAttempts >= 0 &&
    (candidate.lastVerificationError === null ||
      typeof candidate.lastVerificationError === 'string')
  );
};

export interface LiveInstallerStateHook {
  state: LiveInstallerState;
  setState: Dispatch<SetStateAction<LiveInstallerState>>;
  reset: () => void;
  clear: () => void;
}

const useLiveInstallerState = (): LiveInstallerStateHook => {
  const [state, setState, reset, clear] = usePersistentState<LiveInstallerState>(
    LIVE_INSTALLER_STORAGE_KEY,
    defaultLiveInstallerState,
    isLiveInstallerState,
  );

  return { state, setState, reset, clear };
};

export default useLiveInstallerState;
