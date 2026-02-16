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
  <div className="rounded-lg border border-[color:var(--kali-panel-border)] bg-kali-surface/80 p-4 shadow-inner shadow-black/20">
    <dt className="text-sm uppercase tracking-wide text-kali-text/70">{label}</dt>
    <dd className="mt-1 break-words font-mono text-lg text-kali-text">{value}</dd>
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
    <div className="h-full w-full overflow-auto bg-kali-background text-kali-text">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Subnet Calculator</h1>
          <p className="text-sm text-kali-text/80">
            Explore IPv4 subnets by entering an address and prefix length. The calculator derives the network and broadcast
            addresses, usable host range, and capacity in real time.
          </p>
        </header>

        <form
          className="grid gap-4 rounded-xl border border-[color:var(--kali-panel-border)] bg-kali-surface/80 p-4 shadow-kali-panel sm:grid-cols-2"
          onSubmit={(event) => event.preventDefault()}
        >
          <label
            className="flex flex-col gap-2"
            htmlFor="subnet-calculator-ipv4-address"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-kali-text/70">IPv4 address</span>
            <input
              id="subnet-calculator-ipv4-address"
              className="rounded-md border border-[color:var(--kali-panel-border)] bg-kali-surface/70 px-3 py-2 font-mono text-kali-text placeholder:text-kali-text/50 focus:border-kali-focus focus:outline-none focus:ring-2 focus:ring-kali-focus"
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
            <span className="text-xs font-semibold uppercase tracking-wide text-kali-text/70">CIDR prefix</span>
            <input
              id="subnet-calculator-cidr-prefix"
              className="rounded-md border border-[color:var(--kali-panel-border)] bg-kali-surface/70 px-3 py-2 font-mono text-kali-text focus:border-kali-focus focus:outline-none focus:ring-2 focus:ring-kali-focus"
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
            className="rounded-lg border border-kali-severity-high/40 bg-kali-severity-high/15 px-4 py-3 text-sm text-kali-text"
          >
            {result.error}
          </div>
        ) : result.data ? (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-kali-text">Address summary</h2>
              <dl className="grid gap-4">
                <Stat label="CIDR notation" value={`${ipAddress.trim()}/${result.data.cidr}`} />
                <Stat label="Network address" value={result.data.network} />
                <Stat label="Broadcast address" value={result.data.broadcast} />
                <Stat label="Subnet mask" value={result.data.subnetMask} />
                <Stat label="Wildcard mask" value={result.data.wildcardMask} />
              </dl>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-kali-text">Host availability</h2>
              <dl className="grid gap-4">
                <Stat label="Usable host range" value={formatHostRange(result.data.hostRange)} />
                <Stat label="Usable host count" value={result.data.usableHosts} />
                <Stat label="Total addresses" value={result.data.totalAddresses} />
              </dl>
            </div>

            <div className="space-y-4 md:col-span-2">
              <h2 className="text-lg font-semibold text-kali-text">Address intelligence</h2>
              <dl className="grid gap-4 lg:grid-cols-3">
                <Stat label="Address class" value={result.data.addressClass} />
                <Stat label="Address type" value={result.data.privateAddress ? 'Private RFC1918' : 'Public/other range'} />
                <Stat label="IPv4 (binary)" value={result.data.binaryIp} />
              </dl>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default SubnetCalculator;
