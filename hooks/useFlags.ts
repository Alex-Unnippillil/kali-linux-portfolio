'use client';

import { useMemo } from 'react';
import { getFlagValue, getKillSwitchInfo, type KillSwitchInfo } from '../lib/flags';

export function useFlag(id: string): boolean {
  return useMemo(() => getFlagValue(id), [id]);
}

export function useKillSwitch(id?: string): KillSwitchInfo {
  return useMemo(() => getKillSwitchInfo(id), [id]);
}

export default useFlag;
