"use client";

import usePersistentState from './usePersistentState';

export interface ClockConfig {
  label: string;
  timezone: string;
  format: string;
}

const defaultTimezone =
  typeof Intl === 'undefined'
    ? 'UTC'
    : Intl.DateTimeFormat().resolvedOptions().timeZone;

const defaultClocks: ClockConfig[] = [
  { label: 'Local', timezone: defaultTimezone, format: '%a %b %d %I:%M %p' },
];

export function useClocks() {
  return usePersistentState<ClockConfig[]>(
    'clocks',
    defaultClocks,
    (v): v is ClockConfig[] => Array.isArray(v),
  );
}

