'use client';

import { useMemo, useState } from 'react';
import type { HostRange } from '../../modules/networking/subnet';
import { calculateSubnetInfo } from '../../modules/networking/subnet';

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

  const result = useMemo(() => {
    const trimmedIp = ipAddress.trim();
    const trimmedCidr = cidrInput.trim();

    if (!trimmedIp) {
      return { error: 'An IPv4 address is required.' } as const;
    }

    if (!trimmedCidr) {
      return { error: 'A CIDR prefix between 0 and 32 is required.' } as const;
    }

    const cidr = Number(trimmedCidr);

    if (!Number.isInteger(cidr)) {
      return { error: 'CIDR prefix must be a whole number.' } as const;
    }

    try {
      const info = calculateSubnetInfo(trimmedIp, cidr);
      const totalAddresses = 2 ** (32 - info.cidr);
      return { data: { ...info, totalAddresses } } as const;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to calculate subnet information.';
      return { error: message } as const;
    }
  }, [ipAddress, cidrInput]);

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
              aria-label="IPv4 address"
              inputMode="numeric"
              placeholder="e.g. 10.0.0.42"
              value={ipAddress}
              onChange={(event) => setIpAddress(event.target.value)}
            />
          </label>

          <label
            className="flex flex-col gap-2"
            htmlFor="subnet-calculator-cidr-prefix"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">CIDR prefix</span>
            <input
              id="subnet-calculator-cidr-prefix"
              className="rounded-md border border-slate-600 bg-black/40 px-3 py-2 font-mono text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              aria-label="CIDR prefix"
              type="number"
              min={0}
              max={32}
              value={cidrInput}
              onChange={(event) => setCidrInput(event.target.value)}
            />
          </label>
        </form>

        {'error' in result ? (
          <div
            role="alert"
            className="rounded-md border border-red-500/60 bg-red-900/40 px-4 py-3 text-sm text-red-100"
          >
            {result.error}
          </div>
        ) : result.data ? (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Address summary</h2>
              <dl className="grid gap-4">
                <Stat label="CIDR notation" value={`${ipAddress.trim()}/${result.data.cidr}`} />
                <Stat label="Network address" value={result.data.network} />
                <Stat label="Broadcast address" value={result.data.broadcast} />
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
