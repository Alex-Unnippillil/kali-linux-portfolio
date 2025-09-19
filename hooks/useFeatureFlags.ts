"use client";

import { useMemo } from 'react';
import {
  featureFlagRegistry,
  type FeatureFlagDefinition,
  type FeatureFlagId,
  type FeatureFlags,
} from '../types/featureFlags';

const FLAG_ENV_PREFIX = 'NEXT_PUBLIC_FLAG_';
const TRUE_VALUES = new Set(['1', 'true', 'on', 'yes']);
const FALSE_VALUES = new Set(['0', 'false', 'off', 'no']);

const legacyEnvKeys: Partial<Record<FeatureFlagId, string[]>> = {
  beta_badge: ['NEXT_PUBLIC_SHOW_BETA'],
  ui_experiments: ['NEXT_PUBLIC_UI_EXPERIMENTS'],
  metasploit_demo_mode: ['NEXT_PUBLIC_DEMO_MODE'],
};

const registryById: Map<FeatureFlagId, FeatureFlagDefinition> = new Map(
  featureFlagRegistry.map((flag) => [flag.id, flag] as const)
);

function toEnvVarName(id: string): string {
  return (
    FLAG_ENV_PREFIX +
    id
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .toUpperCase()
  );
}

function parseOverride(
  flag: FeatureFlagDefinition,
  raw: string
): boolean | number | string | undefined {
  switch (flag.type) {
    case 'boolean': {
      const normalized = raw.trim().toLowerCase();
      if (TRUE_VALUES.has(normalized)) return true;
      if (FALSE_VALUES.has(normalized)) return false;
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Invalid boolean override for flag "${flag.id}": ${raw}`);
      }
      return undefined;
    }
    case 'number': {
      const value = Number(raw);
      if (!Number.isNaN(value)) {
        return value;
      }
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Invalid numeric override for flag "${flag.id}": ${raw}`);
      }
      return undefined;
    }
    case 'string':
      return raw;
    default:
      return undefined;
  }
}

function readOverride(flag: FeatureFlagDefinition) {
  const keys = [toEnvVarName(flag.id), ...(legacyEnvKeys[flag.id] ?? [])];
  for (const key of keys) {
    const raw = process.env[key];
    if (raw === undefined) continue;
    const parsed = parseOverride(flag, raw);
    if (parsed !== undefined) {
      return parsed as FeatureFlags[typeof flag.id];
    }
  }
  return undefined;
}

function computeValue(flag: FeatureFlagDefinition) {
  const override = readOverride(flag);
  if (override !== undefined) {
    return override as FeatureFlags[typeof flag.id];
  }
  return flag.default as FeatureFlags[typeof flag.id];
}

function computeAllFlags(): FeatureFlags {
  const entries = featureFlagRegistry.map((flag) => [flag.id, computeValue(flag)]);
  return Object.fromEntries(entries) as FeatureFlags;
}

export function getFeatureFlagValue<Id extends FeatureFlagId>(id: Id): FeatureFlags[Id] {
  const definition = registryById.get(id);
  if (!definition) {
    throw new Error(`Unknown feature flag "${id}"`);
  }
  return computeValue(definition) as FeatureFlags[Id];
}

export function useFeatureFlags(): FeatureFlags {
  return useMemo(() => computeAllFlags(), []);
}

export function useFeatureFlag<Id extends FeatureFlagId>(id: Id): FeatureFlags[Id] {
  return useMemo(() => getFeatureFlagValue(id), [id]);
}
