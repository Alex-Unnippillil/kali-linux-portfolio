'use client';

import { useMemo, useState } from 'react';
import type { HostRange } from '../../modules/networking/subnet';
import {
  COMMON_CIDR_PRESETS,
  calculateSubnetInfo,
  parseCidrInput,
  validateIPv4Address,
} from '../../modules/networking/subnet';

const formatHostRange = (range: HostRange) => {
  if (!range.firstHost || !range.lastHost) {
    return 'No usable host addresses';
  }
  if (range.firstHost === range.lastHost) {
    return range.firstHost;
  }
  return `${range.firstHost} – ${range.lastHost}`;
};

interface StatProps {
  label: string;
  value: string | number;
}

const Stat = ({ label, value }: StatProps) => (
  <div className="bg-black/30 rounded-md p-4">
    <dt className="text-sm uppercase tracking-wide text-slate-300">{label}</dt>
    <dd className="mt-1 font-mono text-lg text-white break-words">{value}</dd>
  </div>
);

const SubnetCalculator = () => {
  const [ipAddress, setIpAddress] = useState('192.168.1.10');
  const [cidrInput, setCidrInput] = useState('24');

  const trimmedIp = ipAddress.trim();
  const cidrResult = useMemo(() => parseCidrInput(cidrInput), [cidrInput]);
  const ipError = useMemo(() => validateIPv4Address(ipAddress), [ipAddress]);

  const result = useMemo(() => {
    if (ipError || cidrResult.error || cidrResult.prefix === null) {
      return {
        data: null,
        error: ipError ?? cidrResult.error ?? null,
      } as const;
    }

    try {
      const info = calculateSubnetInfo(trimmedIp, cidrResult.prefix);
      const totalAddresses = 2 ** (32 - info.cidr);
      return { data: { ...info, totalAddresses }, error: null } as const;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to calculate subnet information.';
      return { data: null, error: message } as const;
    }
  }, [cidrResult.error, cidrResult.prefix, ipError, trimmedIp]);

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Subnet Calculator</h1>
          <p className="text-sm text-slate-200">
            Explore IPv4 subnets by entering an address and prefix length. The calculator derives the network and broadcast
            addresses, usable host range, and capacity in real time.
          </p>
        </header>

        <form
          className="grid gap-4 rounded-md bg-black/30 p-4 sm:grid-cols-2"
          onSubmit={(event) => event.preventDefault()}
        >
          <label
            className="flex flex-col gap-2"
            htmlFor="subnet-calculator-ipv4-address"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">IPv4 address</span>
            <input
              id="subnet-calculator-ipv4-address"
              className="rounded-md border border-slate-600 bg-black/40 px-3 py-2 font-mono text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              aria-describedby="subnet-calculator-ipv4-helper"
              inputMode="decimal"
              placeholder="e.g. 10.0.0.42"
              value={ipAddress}
              onChange={(event) => setIpAddress(event.target.value)}
            />
            <p
              id="subnet-calculator-ipv4-helper"
              className={`text-xs ${ipError ? 'text-red-300' : 'text-slate-300'}`}
            >
              {ipError ?? 'Use dotted decimal notation (e.g., 192.168.1.10).'}
            </p>
          </label>

          <label
            className="flex flex-col gap-2"
            htmlFor="subnet-calculator-cidr-prefix"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">CIDR prefix</span>
            <input
              id="subnet-calculator-cidr-prefix"
              className="rounded-md border border-slate-600 bg-black/40 px-3 py-2 font-mono text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              aria-describedby="subnet-calculator-cidr-helper"
              inputMode="decimal"
              placeholder="24 or 255.255.255.0"
              value={cidrInput}
              onChange={(event) => setCidrInput(event.target.value)}
            />
            <p
              id="subnet-calculator-cidr-helper"
              className={`text-xs ${cidrResult.error ? 'text-red-300' : 'text-slate-300'}`}
            >
              {cidrResult.error ?? 'Accepts /prefix (0-32) or subnet masks such as 255.255.255.0.'}
            </p>
          </label>
        </form>

        <section className="rounded-md bg-black/20 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Common presets</h2>
          <p className="mt-1 text-xs text-slate-300">
            Select a prefix to populate the field above. Presets list the mask and total addresses for quick reference.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {COMMON_CIDR_PRESETS.map((preset) => {
              const isActive = !cidrResult.error && cidrResult.prefix === preset.prefix;
              return (
                <button
                  key={preset.prefix}
                  type="button"
                  onClick={() => setCidrInput(String(preset.prefix))}
                  className={`rounded-md border px-3 py-2 text-left text-xs transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    isActive
                      ? 'border-sky-400 bg-sky-600/30 text-white'
                      : 'border-slate-600 bg-black/40 text-slate-100 hover:border-sky-400/80 hover:text-white'
                  }`}
                  aria-pressed={isActive}
                  title={`/${preset.prefix} • ${preset.mask}`}
                >
                  <span className="block font-semibold">/{preset.prefix}</span>
                  <span className="block font-mono text-[0.7rem] text-slate-200">{preset.mask}</span>
                  <span className="block text-[0.7rem] text-slate-300">{preset.totalAddresses} addresses</span>
                </button>
              );
            })}
          </div>
        </section>

        {result.error && !ipError && !cidrResult.error ? (
          <div
            role="alert"
            className="rounded-md border border-red-500/60 bg-red-900/40 px-4 py-3 text-sm text-red-100"
          >
            {result.error}
          </div>
        ) : null}

        {result.data ? (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Address summary</h2>
              <dl className="grid gap-4">
                <Stat label="CIDR notation" value={`${trimmedIp}/${result.data.cidr}`} />
                <Stat label="Network address" value={result.data.network} />
                <Stat label="Broadcast address" value={result.data.broadcast} />
                <Stat label="Subnet mask" value={result.data.mask} />
              </dl>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Host availability</h2>
              <dl className="grid gap-4">
                <Stat label="Usable host range" value={formatHostRange(result.data.hostRange)} />
                <Stat label="Usable host count" value={result.data.usableHosts} />
                <Stat label="Total addresses" value={result.data.totalAddresses} />
              </dl>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default SubnetCalculator;
