'use client';

import { useMemo } from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import { intersects, satisfies, valid, validRange } from 'semver';

type PackageVersionMap = Record<string, string>;

export interface PluginMetadata {
  id: string;
  name?: string;
  peerDependencies?: Record<string, string>;
}

export interface PeerDependencyIssue {
  pluginId: string;
  pluginName: string;
  dependency: string;
  requiredRange: string;
  installedVersion: string | null;
}

export interface DiagnosticsProps {
  manifests: PluginMetadata[];
  hostPackages?: PackageVersionMap;
  emptyState?: ReactNode;
  successState?: ReactNode;
}

const defaultHostPackages: PackageVersionMap =
  (typeof window !== 'undefined'
    ? (window as typeof window & { __PLUGIN_HOST_PACKAGES__?: PackageVersionMap }).__PLUGIN_HOST_PACKAGES__
    : (globalThis as typeof globalThis & { __PLUGIN_HOST_PACKAGES__?: PackageVersionMap }).__PLUGIN_HOST_PACKAGES__) ||
  {};

const semverOptions = { includePrerelease: true } as const;

function isPeerDependencySatisfied(installed: string | undefined, required: string): boolean {
  if (!required) {
    return true;
  }

  const normalizedRequired = validRange(required.trim());
  if (!normalizedRequired) {
    // If the plugin declares an invalid range, we skip raising a warning. The
    // author needs to fix their manifest but it should not block installations.
    return true;
  }

  if (!installed) {
    return false;
  }

  const trimmedInstalled = installed.trim();
  const normalizedVersion = valid(trimmedInstalled);
  if (normalizedVersion) {
    return satisfies(normalizedVersion, normalizedRequired, semverOptions);
  }

  const normalizedRange = validRange(trimmedInstalled);
  if (normalizedRange) {
    return intersects(normalizedRange, normalizedRequired, semverOptions);
  }

  return false;
}

export function detectPeerDependencyIssues(
  manifests: PluginMetadata[],
  hostPackages: PackageVersionMap
): PeerDependencyIssue[] {
  const issues: PeerDependencyIssue[] = [];

  manifests.forEach((manifest) => {
    const peers = manifest.peerDependencies;
    if (!peers) {
      return;
    }

    Object.entries(peers).forEach(([dependency, requiredRange]) => {
      const installed = hostPackages[dependency];
      if (!isPeerDependencySatisfied(installed, requiredRange)) {
        issues.push({
          pluginId: manifest.id,
          pluginName: manifest.name || manifest.id,
          dependency,
          requiredRange,
          installedVersion: installed ?? null,
        });
      }
    });
  });

  return issues.sort((a, b) => {
    if (a.pluginName === b.pluginName) {
      return a.dependency.localeCompare(b.dependency);
    }
    return a.pluginName.localeCompare(b.pluginName);
  });
}

function formatRange(range: string): string {
  const trimmed = range.trim();
  if (!trimmed) {
    return trimmed;
  }

  const quoteNeeded = /(?:\s|\|\||&&)/.test(trimmed);
  if (!quoteNeeded && !trimmed.includes('"')) {
    return trimmed;
  }

  const escaped = trimmed.replace(/"/g, '\\"');
  return `"${escaped}"`;
}

export function formatInstallCommands(dependency: string, range: string) {
  const specifier = formatRange(range);
  const suffix = specifier ? `@${specifier}` : '';
  return {
    yarn: `yarn add ${dependency}${suffix}`.trim(),
    npm: `npm install ${dependency}${suffix}`.trim(),
  };
}

function DiagnosticsContainer({ children }: PropsWithChildren) {
  return (
    <div className="mt-6 rounded border border-ub-gray-50/40 bg-black/40 p-4">
      <h2 className="text-lg font-semibold text-white">Diagnostics</h2>
      <p className="mt-1 text-sm text-ub-gray-50">
        Peer dependency checks compare the host environment with the requirements listed in each plugin manifest.
      </p>
      <div className="mt-4 space-y-4 text-sm text-white">{children}</div>
    </div>
  );
}

export default function Diagnostics({
  manifests,
  hostPackages,
  emptyState,
  successState,
}: DiagnosticsProps) {
  const packages = hostPackages ?? defaultHostPackages;
  const issues = useMemo(() => detectPeerDependencyIssues(manifests, packages), [manifests, packages]);

  if (!manifests.length) {
    return (
      <DiagnosticsContainer>
        {emptyState || 'Install a plugin to run diagnostics.'}
      </DiagnosticsContainer>
    );
  }

  if (!issues.length) {
    return (
      <DiagnosticsContainer>
        {successState || 'All plugin peer dependencies are satisfied.'}
      </DiagnosticsContainer>
    );
  }

  return (
    <DiagnosticsContainer>
      {issues.map((issue) => {
        const commands = formatInstallCommands(issue.dependency, issue.requiredRange);
        return (
          <div
            key={`${issue.pluginId}-${issue.dependency}`}
            className="rounded border border-ub-gray-50/40 bg-black/40 p-3"
          >
            <div className="font-medium text-ub-orange">
              {issue.pluginName} requires <code className="ml-1 text-white">{issue.dependency}</code>
            </div>
            <p className="mt-1 text-xs text-ub-gray-100">
              Expected <code>{issue.requiredRange}</code>
              {issue.installedVersion
                ? (
                    <span>
                      {' '}
                      but the host provides <code>{issue.installedVersion}</code>.
                    </span>
                  )
                : ' but it is not currently installed.'}
            </p>
            <div className="mt-3 space-y-2 text-xs">
              <div>
                <span className="block text-ub-gray-100">Install with Yarn:</span>
                <code className="mt-1 block break-all rounded bg-black/60 px-2 py-1 text-white">
                  {commands.yarn}
                </code>
              </div>
              <div>
                <span className="block text-ub-gray-100">Install with npm:</span>
                <code className="mt-1 block break-all rounded bg-black/60 px-2 py-1 text-white">
                  {commands.npm}
                </code>
              </div>
            </div>
          </div>
        );
      })}
    </DiagnosticsContainer>
  );
}

export { formatRange };
