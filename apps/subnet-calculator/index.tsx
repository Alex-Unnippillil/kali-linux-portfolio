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
  accent?: boolean;
}

const Stat = ({ label, value, accent = false }: StatProps) => (
  <div
    className={`group relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950/70 p-5 shadow-sm transition-colors duration-300 hover:border-sky-400/40 ${accent ? 'ring-1 ring-sky-500/40' : ''}`}
  >
    {accent ? (
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-400 to-transparent opacity-80"
        aria-hidden
      />
    ) : null}
    <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.35em] text-slate-300">
      {label}
    </dt>
    <dd
      className={`mt-3 break-words font-mono text-lg leading-tight sm:text-xl ${
        accent ? 'text-sky-100 drop-shadow-[0_0_16px_rgba(125,211,252,0.45)]' : 'text-slate-100'
      }`}
    >
      {value}
    </dd>
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
    <div className="h-full w-full overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-12">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-sky-300/80">Network utility</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Subnet Calculator</h1>
          <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
            Explore IPv4 subnets by entering an address and prefix length. The calculator derives the network and broadcast
            addresses, usable host range, and address capacity in real time so you can validate segmentation plans quickly.
          </p>
        </header>

        <form
          className="grid gap-4 rounded-2xl border border-slate-700/60 bg-slate-950/70 p-6 shadow-lg backdrop-blur sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]"
          onSubmit={(event) => event.preventDefault()}
        >
          <label
            className="flex flex-col gap-3"
            htmlFor="subnet-calculator-ipv4-address"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">IPv4 address</span>
            <input
              id="subnet-calculator-ipv4-address"
              className="rounded-lg border border-slate-600/70 bg-slate-950/40 px-3 py-3 font-mono text-base text-slate-100 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
              aria-label="IPv4 address"
              inputMode="numeric"
              placeholder="e.g. 10.0.0.42"
              value={ipAddress}
              onChange={(event) => setIpAddress(event.target.value)}
            />
          </label>

          <label
            className="flex flex-col gap-3"
            htmlFor="subnet-calculator-cidr-prefix"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">CIDR prefix</span>
            <input
              id="subnet-calculator-cidr-prefix"
              className="rounded-lg border border-slate-600/70 bg-slate-950/40 px-3 py-3 font-mono text-base text-slate-100 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
              aria-label="CIDR prefix"
              type="number"
              min={0}
              max={32}
              value={cidrInput}
              onChange={(event) => setCidrInput(event.target.value)}
            />
          </label>

          <p className="sm:col-span-2 text-xs text-slate-400">
            Hint: presets in the launcher menu will populate the inputs instantly. Copy buttons remain available in result cards
            so you can share addresses across other tools.
          </p>
        </form>

        {'error' in result ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/60 bg-red-900/40 px-4 py-3 text-sm text-red-100 shadow-lg"
          >
            {result.error}
          </div>
        ) : result.data ? (
          <section className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
              <article className="space-y-4 rounded-2xl border border-slate-700/60 bg-slate-950/70 p-6 shadow-lg">
                <header className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-100 sm:text-xl">Address summary</h2>
                  <p className="text-sm text-slate-400">
                    Confirm network boundaries and CIDR notation before provisioning routes or ACLs.
                  </p>
                </header>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Stat accent label="CIDR notation" value={`${ipAddress.trim()}/${result.data.cidr}`} />
                  <Stat label="Network address" value={result.data.network} />
                  <Stat label="Broadcast address" value={result.data.broadcast} />
                </dl>
              </article>

              <article className="space-y-4 rounded-2xl border border-slate-700/60 bg-slate-950/70 p-6 shadow-lg">
                <header className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-100 sm:text-xl">Host availability</h2>
                  <p className="text-sm text-slate-400">
                    Quickly evaluate usable host ranges and capacity to size VLANs or lab segments.
                  </p>
                </header>
                <dl className="grid gap-4">
                  <Stat accent label="Usable host range" value={formatHostRange(result.data.hostRange)} />
                  <Stat label="Usable host count" value={result.data.usableHosts} />
                  <Stat label="Total addresses" value={result.data.totalAddresses} />
                </dl>
              </article>
            </div>

            <aside className="rounded-2xl border border-slate-700/60 bg-slate-950/60 p-6 text-sm text-slate-300 shadow-lg">
              <h3 className="text-base font-semibold text-slate-100">How to read these results</h3>
              <p className="mt-2 leading-relaxed">
                The highlighted CIDR and host range values call out the core planning metrics for a subnet. CIDR notation
                confirms the network boundary, while the host range shows the usable span between the first and last hosts. Use
                the totals to double-check that connected devices fit comfortably within the allocation.
              </p>
            </aside>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default SubnetCalculator;
