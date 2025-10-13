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
  <div className="rounded-lg border border-white/10 bg-kali-surface/80 p-4 shadow-kali-panel">
    <dt className="text-sm uppercase tracking-wide text-white/70">{label}</dt>
    <dd className="mt-1 break-words font-mono text-lg text-white">{value}</dd>
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
          className="grid gap-4 rounded-xl border border-white/10 bg-kali-surface/80 p-4 shadow-kali-panel backdrop-blur-sm sm:grid-cols-2"
          onSubmit={(event) => event.preventDefault()}
        >
          <label
            className="flex flex-col gap-2"
            htmlFor="subnet-calculator-ipv4-address"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-white/70">IPv4 address</span>
            <input
              id="subnet-calculator-ipv4-address"
              className="rounded-lg border border-white/10 bg-kali-background/70 px-3 py-2 font-mono text-white transition focus:border-kali-control focus:outline-none focus:ring-2 focus:ring-kali-control/50"
              aria-label="IPv4 address"
              inputMode="numeric"
              placeholder="e.g. 10.0.0.42"
              value={ipAddress}
              onChange={(event) => setIpAddress(event.target.value)}
            />
            <span className="text-xs text-[color:color-mix(in_srgb,var(--color-warning)_70%,white)]">
              Use dotted decimal notation (for example 192.168.1.10).
            </span>
          </label>

          <label
            className="flex flex-col gap-2"
            htmlFor="subnet-calculator-cidr-prefix"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-white/70">CIDR prefix</span>
            <input
              id="subnet-calculator-cidr-prefix"
              className="rounded-lg border border-white/10 bg-kali-background/70 px-3 py-2 font-mono text-white transition focus:border-kali-control focus:outline-none focus:ring-2 focus:ring-kali-control/50"
              aria-label="CIDR prefix"
              type="number"
              min={0}
              max={32}
              value={cidrInput}
              onChange={(event) => setCidrInput(event.target.value)}
            />
            <span className="text-xs text-[color:color-mix(in_srgb,var(--color-warning)_70%,white)]">
              Enter a value between 0 and 32 to describe the subnet mask length.
            </span>
          </label>
        </form>

        {'error' in result ? (
          <div
            role="alert"
            className="rounded-lg border border-[color:color-mix(in_srgb,var(--color-warning)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--color-warning)_14%,transparent)] px-4 py-3 text-sm text-[color:color-mix(in_srgb,var(--color-warning)_85%,white)] shadow-kali-panel"
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
