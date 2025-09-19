"use client";

import usePersistentState from './usePersistentState';

export interface DisplayWorkspaceDefinition {
  id: string;
  name: string;
}

export interface DisplayWorkspaceConfig {
  displays: DisplayWorkspaceDefinition[];
  primary: string;
}

export const DEFAULT_DISPLAY_CONFIG: DisplayWorkspaceConfig = {
  displays: [{ id: 'display-1', name: 'Primary Workspace' }],
  primary: 'display-1',
};

function isDisplayWorkspaceDefinition(value: unknown): value is DisplayWorkspaceDefinition {
  if (!value || typeof value !== 'object') return false;
  const entry = value as DisplayWorkspaceDefinition;
  return typeof entry.id === 'string' && typeof entry.name === 'string';
}

function isDisplayWorkspaceConfig(value: unknown): value is DisplayWorkspaceConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as DisplayWorkspaceConfig;
  if (!Array.isArray(config.displays) || typeof config.primary !== 'string') {
    return false;
  }
  return config.displays.every(isDisplayWorkspaceDefinition);
}

export default function useDisplayConfig() {
  return usePersistentState<DisplayWorkspaceConfig>(
    'display-config',
    DEFAULT_DISPLAY_CONFIG,
    isDisplayWorkspaceConfig,
  );
}
