'use client';

import { useMemo, useState } from 'react';
import {
  IdentifierBreakdown,
  NibbleMatrix,
  expandIpv6,
  interfaceIdentifierFromIpv6,
  macToEui64,
  nibbleMatrixFromHextets,
} from '../../modules/networking/subnet';

type IdentifierResult = IdentifierBreakdown | { error: string };

type IPv6BreakdownResult =
  | {
      normalized: string;
      nibbleMatrix: NibbleMatrix;
      interfaceId: IdentifierBreakdown;
    }
  | { error: string };

const DEFAULT_IPV6 = '2001:db8::1428:57ab';
const DEFAULT_MAC = '00:25:96:12:34:56';

function NibbleGrid({ matrix, title }: { matrix: NibbleMatrix; title: string }) {
  if (!matrix.length) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-sky-300">{title}</h3>
      <div className="flex flex-wrap gap-2 font-mono text-sm">
        {matrix.map((group, hextetIndex) => (
          <div
            key={`hextet-${hextetIndex}`}
            className="rounded border border-slate-700 bg-slate-900/60 px-2 py-2"
          >
            <div className="flex items-center justify-between text-[10px] uppercase text-slate-300">
              <span>H{hextetIndex + 1}</span>
              <span>{group.join('')}</span>
            </div>
            <div className="mt-1 grid grid-cols-4 gap-1 text-center">
              {group.map((nibble, nibbleIndex) => (
                <span
                  key={`n-${hextetIndex}-${nibbleIndex}`}
                  className="rounded bg-black/60 px-2 py-1 text-xs text-cyan-100"
                >
                  {nibble}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BinaryStrip({ groups, title }: { groups: string[]; title: string }) {
  if (!groups.length) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-sky-300">{title}</h4>
      <div className="flex flex-wrap gap-1 font-mono text-xs">
        {groups.map((group, index) => (
          <span
            key={`binary-${group}-${index}`}
            className="rounded border border-slate-700 bg-black/60 px-2 py-1 text-cyan-100"
          >
            {group}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SubnetCalculator() {
  const [ipv6Input, setIpv6Input] = useState(DEFAULT_IPV6);
  const [macInput, setMacInput] = useState(DEFAULT_MAC);

  const ipv6Breakdown = useMemo<IPv6BreakdownResult>(() => {
    try {
      const hextets = expandIpv6(ipv6Input);
      return {
        normalized: hextets.join(':'),
        nibbleMatrix: nibbleMatrixFromHextets(hextets),
        interfaceId: interfaceIdentifierFromIpv6(ipv6Input),
      };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }, [ipv6Input]);

  const eui64 = useMemo<IdentifierResult>(() => {
    try {
      return macToEui64(macInput);
    } catch (error) {
      return { error: (error as Error).message };
    }
  }, [macInput]);

  const matchingIdentifier =
    !('error' in ipv6Breakdown) && !('error' in eui64)
      ? ipv6Breakdown.interfaceId.value === eui64.value
      : false;

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto bg-gray-900 p-4 text-white">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-sky-200">Subnet Calculator – IPv6 Focus</h1>
        <p className="text-sm text-slate-300">
          Expand IPv6 literals, inspect their nibble boundaries, and derive interface identifiers
          using the EUI-64 algorithm. Calculations are performed locally and never leave this
          browser window.
        </p>
      </header>

      <section className="space-y-4 rounded border border-slate-800 bg-slate-950/60 p-4 shadow">
        <h2 className="text-lg font-semibold text-sky-200">IPv6 Interface Identifier</h2>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-200">IPv6 address</span>
          <input
            className="w-full rounded border border-slate-700 bg-slate-900 p-2 font-mono text-white focus:border-sky-500 focus:outline-none"
            value={ipv6Input}
            onChange={(event) => setIpv6Input(event.target.value)}
            placeholder="2001:db8::1/64"
            aria-label="IPv6 address"
          />
        </label>

        {'error' in ipv6Breakdown ? (
          <p className="rounded border border-red-700 bg-red-900/60 p-3 text-sm text-red-200">
            {ipv6Breakdown.error}
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-sky-300">
                Normalized address
              </h3>
              <pre className="mt-1 overflow-auto rounded bg-black/70 p-2 font-mono text-cyan-200">
                {ipv6Breakdown.normalized}
              </pre>
            </div>

            <NibbleGrid matrix={ipv6Breakdown.nibbleMatrix} title="Nibble groups" />

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-sky-300">
                  Interface identifier (last 64 bits)
                </h3>
                <pre className="mt-1 overflow-auto rounded bg-black/70 p-2 font-mono text-cyan-200">
                  {ipv6Breakdown.interfaceId.value}
                </pre>
              </div>
              <NibbleGrid
                matrix={ipv6Breakdown.interfaceId.nibbleMatrix}
                title="Interface identifier nibble groups"
              />
              <BinaryStrip
                groups={ipv6Breakdown.interfaceId.binaryGroups}
                title="Binary (grouped by nibble)"
              />
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded border border-slate-800 bg-slate-950/60 p-4 shadow">
        <h2 className="text-lg font-semibold text-sky-200">EUI-64 from MAC address</h2>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-200">MAC address</span>
          <input
            className="w-full rounded border border-slate-700 bg-slate-900 p-2 font-mono text-white focus:border-sky-500 focus:outline-none"
            value={macInput}
            onChange={(event) => setMacInput(event.target.value)}
            placeholder="00:00:5e:00:53:af"
            aria-label="MAC address"
          />
        </label>

        {'error' in eui64 ? (
          <p className="rounded border border-red-700 bg-red-900/60 p-3 text-sm text-red-200">
            {eui64.error}
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-sky-300">
                Derived EUI-64 identifier
              </h3>
              <pre className="mt-1 overflow-auto rounded bg-black/70 p-2 font-mono text-cyan-200">
                {eui64.value}
              </pre>
            </div>
            <NibbleGrid matrix={eui64.nibbleMatrix} title="EUI-64 nibble groups" />
            <BinaryStrip groups={eui64.binaryGroups} title="Binary (grouped by nibble)" />
          </div>
        )}

        {!('error' in ipv6Breakdown) && !('error' in eui64) ? (
          <p className="text-xs text-slate-400">
            Interface identifier {matchingIdentifier ? 'matches' : 'does not match'} the derived
            EUI-64 value for the provided inputs.
          </p>
        ) : null}
      </section>
    </div>
  );
}
