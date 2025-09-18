'use client';

import { useMemo, useState } from 'react';
import {
  CoverageReport,
  IPv4AddressRange,
  IPv4Cidr,
  IPv4Subnet,
  VlsmAllocation,
  VlsmPlan,
  VlsmRequirement,
  formatCidr,
  parseCidr,
  performVlsm,
  summarizeSubnets,
} from '../../modules/networking/subnet';

interface SummaryState {
  errors: string[];
  result: CoverageReport<IPv4Subnet> | null;
}

interface VlsmState {
  base: IPv4Cidr | null;
  baseError: string | null;
  requirementErrors: string[];
  result: VlsmPlan | null;
}

const DEFAULT_SUMMARY = ['192.168.10.0/25', '192.168.10.128/25'].join('\n');
const DEFAULT_BASE = '10.0.0.0/24';
const DEFAULT_REQUIREMENTS = '90, 40, 20, 10';

function parseSummaryInput(value: string): SummaryState {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const errors: string[] = [];
  const cidrs: IPv4Cidr[] = [];

  lines.forEach((line, index) => {
    try {
      cidrs.push(parseCidr(line));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid CIDR';
      errors.push(`Line ${index + 1}: ${message}`);
    }
  });

  const result = cidrs.length > 0 && errors.length === 0 ? summarizeSubnets(cidrs) : null;

  return { errors, result };
}

function parseHosts(value: string): { requirements: VlsmRequirement[]; errors: string[] } {
  const requirements: VlsmRequirement[] = [];
  const errors: string[] = [];

  const entries = value
    .split(/[,\n]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  entries.forEach((token, index) => {
    const numeric = Number(token);
    if (!Number.isFinite(numeric)) {
      errors.push(`Entry ${index + 1} is not a number.`);
      return;
    }
    const integer = Math.trunc(numeric);
    if (integer !== numeric) {
      errors.push(`Entry ${index + 1} must be an integer.`);
      return;
    }
    if (integer < 0) {
      errors.push(`Entry ${index + 1} must be zero or positive.`);
      return;
    }
    requirements.push({ hosts: integer, label: `Subnet ${index + 1}` });
  });

  return { requirements, errors };
}

function formatGap(gap: IPv4AddressRange) {
  return `${gap.start} – ${gap.end} (${gap.size.toLocaleString()} addresses)`;
}

function SummaryTable({ subnets }: { subnets: IPv4Subnet[] }) {
  if (subnets.length === 0) {
    return (
      <p className="rounded border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300">
        Provide at least one subnet to view the summary.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-700 text-sm">
        <thead className="bg-slate-800">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">CIDR</th>
            <th className="px-3 py-2 text-left font-semibold">Network</th>
            <th className="px-3 py-2 text-left font-semibold">Broadcast</th>
            <th className="px-3 py-2 text-left font-semibold">Usable Hosts</th>
            <th className="px-3 py-2 text-left font-semibold">Total Addresses</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {subnets.map((subnet) => (
            <tr key={subnet.cidr}>
              <td className="px-3 py-2 font-mono">{subnet.cidr}</td>
              <td className="px-3 py-2 font-mono">{subnet.network}</td>
              <td className="px-3 py-2 font-mono">{subnet.broadcast}</td>
              <td className="px-3 py-2">{subnet.usableHosts.toLocaleString()}</td>
              <td className="px-3 py-2">{subnet.totalAddresses.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VlsmTable({ allocations }: { allocations: VlsmAllocation[] }) {
  if (allocations.length === 0) {
    return (
      <p className="rounded border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300">
        Add host requirements to build a VLSM plan.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-700 text-sm">
        <thead className="bg-slate-800">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Label</th>
            <th className="px-3 py-2 text-left font-semibold">Hosts Requested</th>
            <th className="px-3 py-2 text-left font-semibold">Allocated CIDR</th>
            <th className="px-3 py-2 text-left font-semibold">Usable Hosts</th>
            <th className="px-3 py-2 text-left font-semibold">Unused Capacity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {allocations.map((allocation) => (
            <tr key={`${allocation.cidr}-${allocation.requirement.originalIndex}`}>
              <td className="px-3 py-2">
                {allocation.requirement.label ?? `Subnet ${allocation.requirement.originalIndex + 1}`}
              </td>
              <td className="px-3 py-2">{allocation.requirement.hosts.toLocaleString()}</td>
              <td className="px-3 py-2 font-mono">{allocation.cidr}</td>
              <td className="px-3 py-2">{allocation.usableHosts.toLocaleString()}</td>
              <td className="px-3 py-2">{allocation.wastedAddresses.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SubnetCalculator() {
  const [summaryInput, setSummaryInput] = useState(DEFAULT_SUMMARY);
  const [baseInput, setBaseInput] = useState(DEFAULT_BASE);
  const [hostInput, setHostInput] = useState(DEFAULT_REQUIREMENTS);

  const summaryState = useMemo(() => parseSummaryInput(summaryInput), [summaryInput]);

  const vlsmState = useMemo(() => {
    let base: IPv4Cidr | null = null;
    let baseError: string | null = null;

    try {
      base = parseCidr(baseInput);
    } catch (error) {
      baseError = error instanceof Error ? error.message : 'Invalid CIDR';
    }

    const { requirements, errors: requirementErrors } = parseHosts(hostInput);
    const result =
      base && requirementErrors.length === 0
        ? performVlsm({ base, requirements })
        : null;

    return { base, baseError, requirementErrors, result } satisfies VlsmState;
  }, [baseInput, hostInput]);

  return (
    <div className="flex h-full flex-col gap-6 bg-slate-900 p-4 text-slate-100">
      <header>
        <h1 className="text-2xl font-semibold">Subnet Calculator</h1>
        <p className="mt-1 text-sm text-slate-300">
          Summarize IPv4 networks and build variable-length subnetting plans with automatic gap detection.
        </p>
      </header>

      <section className="space-y-4 rounded-lg border border-slate-700 bg-slate-950/60 p-4 shadow">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold">Subnet Summarization</h2>
          <p className="text-sm text-slate-300">
            Enter IPv4 networks in CIDR notation. The tool merges adjacent ranges and highlights uncovered gaps.
          </p>
        </header>
        <div>
          <label htmlFor="summary-input" className="mb-1 block text-sm font-medium text-slate-200">
            CIDR ranges (one per line)
          </label>
          <textarea
            id="summary-input"
            value={summaryInput}
            onChange={(event) => setSummaryInput(event.target.value)}
            className="h-32 w-full resize-y rounded border border-slate-700 bg-slate-900 p-2 font-mono text-sm text-slate-100 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
            placeholder="192.168.0.0/24"
          />
          {summaryState.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-red-400">
              {summaryState.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
        {summaryState.result && (
          <div className="space-y-3">
            <SummaryTable subnets={summaryState.result.subnets} />
            <div className="text-sm text-slate-300">
              <p>
                Total coverage: {summaryState.result.totalAddresses.toLocaleString()} addresses across{' '}
                {summaryState.result.subnets.length} subnet{summaryState.result.subnets.length === 1 ? '' : 's'}.
              </p>
              {!summaryState.result.isGapFree && summaryState.result.gaps.length > 0 && (
                <div className="mt-2 rounded border border-amber-500/60 bg-amber-500/10 p-3 text-amber-200">
                  <p className="font-semibold">Gap detected</p>
                  <ul className="mt-1 list-inside list-disc space-y-1">
                    {summaryState.result.gaps.map((gap) => (
                      <li key={gap.start}>{formatGap(gap)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {summaryState.result.isGapFree && (
                <p className="mt-2 rounded border border-emerald-500/50 bg-emerald-500/10 p-3 text-emerald-200">
                  The supplied ranges provide continuous coverage without gaps.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-lg border border-slate-700 bg-slate-950/60 p-4 shadow">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold">VLSM Planner</h2>
          <p className="text-sm text-slate-300">
            Define a base network and host requirements. Allocations are made from largest to smallest and any gaps or
            unallocated segments are reported.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="base-input" className="mb-1 block text-sm font-medium text-slate-200">
              Base network (CIDR)
            </label>
            <input
              id="base-input"
              value={baseInput}
              onChange={(event) => setBaseInput(event.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900 p-2 font-mono text-sm text-slate-100 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="10.0.0.0/24"
            />
            {vlsmState.baseError && (
              <p className="mt-1 text-sm text-red-400">{vlsmState.baseError}</p>
            )}
          </div>
          <div>
            <label htmlFor="hosts-input" className="mb-1 block text-sm font-medium text-slate-200">
              Host requirements (comma or newline separated)
            </label>
            <textarea
              id="hosts-input"
              value={hostInput}
              onChange={(event) => setHostInput(event.target.value)}
              className="h-32 w-full resize-y rounded border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="90, 40, 20, 10"
            />
            {vlsmState.requirementErrors.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-red-400">
                {vlsmState.requirementErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {vlsmState.result && (
          <div className="space-y-3">
            <div className="rounded border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200">
              <p className="font-semibold">Base network: {formatCidr(vlsmState.result.base)}</p>
              <p className="mt-1">
                Total addresses: {vlsmState.result.base.totalAddresses.toLocaleString()} — usable hosts:{' '}
                {vlsmState.result.base.usableHosts.toLocaleString()}
              </p>
            </div>
            <VlsmTable allocations={vlsmState.result.subnets} />
            <div className="text-sm text-slate-300">
              <p>
                Allocated coverage: {vlsmState.result.totalAddresses.toLocaleString()} addresses across{' '}
                {vlsmState.result.subnets.length} subnet{vlsmState.result.subnets.length === 1 ? '' : 's'}.
              </p>
              {vlsmState.result.unallocated.length > 0 && (
                <div className="mt-2 rounded border border-red-500/60 bg-red-500/10 p-3 text-red-200">
                  <p className="font-semibold">Unallocated requirements</p>
                  <ul className="mt-1 list-inside list-disc space-y-1">
                    {vlsmState.result.unallocated.map((req) => (
                      <li key={req.originalIndex}>
                        {(req.label ?? `Subnet ${req.originalIndex + 1}`) + ': '}
                        {req.hosts.toLocaleString()} hosts
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {vlsmState.result.gaps.length > 0 && (
                <div className="mt-2 rounded border border-amber-500/60 bg-amber-500/10 p-3 text-amber-200">
                  <p className="font-semibold">Unassigned address space</p>
                  <ul className="mt-1 list-inside list-disc space-y-1">
                    {vlsmState.result.gaps.map((gap) => (
                      <li key={gap.start}>{formatGap(gap)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {vlsmState.result.isGapFree && (
                <p className="mt-2 rounded border border-emerald-500/50 bg-emerald-500/10 p-3 text-emerald-200">
                  Plan covers the base network without gaps or leftover requirements.
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
