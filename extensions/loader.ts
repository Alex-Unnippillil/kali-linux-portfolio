import fs from 'fs';
import path from 'path';

import { CORE_API_NAME, CORE_API_VERSION } from './constants';
import { checkSatisfiesRange, describeRangeResult } from './semver';
import type { ExtensionManifest } from './types';

export type LoadExtensionErrorCode =
  | 'invalid-manifest'
  | 'invalid-requirement'
  | 'incompatible-core';

export interface LoadExtensionError {
  code: LoadExtensionErrorCode;
  message: string;
  expected?: string;
  actual?: string;
  detail?: string;
}

export interface LoadExtensionResult {
  manifest?: ExtensionManifest;
  warnings: string[];
  error?: LoadExtensionError;
}

export interface LoadExtensionOptions {
  currentCoreVersion?: string;
}

const resolveDisplayId = (manifest: ExtensionManifest, filePath: string): string =>
  manifest.id || path.parse(filePath).name;

export const loadExtensionManifest = (
  filePath: string,
  options: LoadExtensionOptions = {}
): LoadExtensionResult => {
  const { currentCoreVersion = CORE_API_VERSION } = options;

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw error;
  }

  let manifest: ExtensionManifest;
  try {
    manifest = JSON.parse(raw) as ExtensionManifest;
  } catch (error) {
    return {
      warnings: [],
      error: {
        code: 'invalid-manifest',
        message: `Extension manifest at "${filePath}" is not valid JSON.`,
        detail: error instanceof Error ? error.message : undefined,
      },
    };
  }

  const warnings: string[] = [];
  const displayId = resolveDisplayId(manifest, filePath);

  if (manifest.requires?.core !== undefined) {
    const requirement = manifest.requires.core;

    if (typeof requirement !== 'string') {
      return {
        warnings,
        error: {
          code: 'invalid-requirement',
          message: `Extension "${displayId}" declares a non-string core requirement.`,
        },
      };
    }

    const trimmedRequirement = requirement.trim();
    if (trimmedRequirement.length > 0) {
      const result = checkSatisfiesRange(trimmedRequirement, currentCoreVersion);

      if (!result.ok) {
        const summary = describeRangeResult(result, CORE_API_NAME);
        const errorCode =
          result.issue === 'range-invalid' || result.issue === 'version-invalid'
            ? 'invalid-requirement'
            : 'incompatible-core';
        return {
          warnings,
          error: {
            code: errorCode,
            message: `Extension "${displayId}": ${summary}`,
            expected: result.expected,
            actual: result.actual,
            detail: result.detail,
          },
        };
      }
    }
  }

  return { manifest, warnings };
};
