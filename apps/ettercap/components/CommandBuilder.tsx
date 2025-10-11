'use client';

import React, { useEffect, useMemo, useState } from 'react';

import type fixturesData from '../../../components/apps/ettercap/fixtures';

type Fixture = (typeof fixturesData)[number];

type CommandBuilderProps = {
  fixture?: Fixture;
  disabled?: boolean;
};

const INTERFACES = ['eth0', 'wlan0', 'tun0'];

const ATTACK_PROFILES = [
  { id: 'text', label: 'Text-only interface (-T)', flag: '-T' },
  { id: 'unified', label: 'Unified sniffing (-U)', flag: '-U' },
  { id: 'arpRemote', label: 'ARP MITM (-M arp:remote)', flag: '-M arp:remote' },
];

const EXTRA_FLAGS = [
  { id: 'dnsSpoof', label: 'Enable dns_spoof plugin', flag: '--plugin dns_spoof' },
  { id: 'writePcap', label: 'Write capture ( -w capture-demo.pcap )', flag: '-w capture-demo.pcap' },
  { id: 'filter', label: 'Apply filter file ( -F lab-filter.ecf )', flag: '-F lab-filter.ecf' },
];

const buildTargets = (targetA: string, targetB: string) => {
  const normalized = (value: string) => value.trim() || '';
  const left = normalized(targetA);
  const right = normalized(targetB);
  return `${left ? `/${left}/` : '//' } ${right ? `/${right}/` : '//'}`.trim();
};

const CommandBuilder: React.FC<CommandBuilderProps> = ({ fixture, disabled }) => {
  const [iface, setIface] = useState('eth0');
  const [enabledFlags, setEnabledFlags] = useState<string[]>(['-T', '-M arp:remote']);
  const [targetA, setTargetA] = useState('');
  const [targetB, setTargetB] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  useEffect(() => {
    if (!fixture) return;
    setTargetA(fixture.hosts[1]?.ip ?? '');
    setTargetB(fixture.hosts[0]?.ip ?? '');
  }, [fixture?.id]);

  const toggleFlag = (flag: string) => {
    setEnabledFlags((current) =>
      current.includes(flag)
        ? current.filter((value) => value !== flag)
        : [...current, flag],
    );
  };

  const command = useMemo(() => {
    const parts = ['ettercap'];
    if (iface) {
      parts.push('-i', iface);
    }
    const orderedFlags = ATTACK_PROFILES.concat(EXTRA_FLAGS)
      .map((profile) => profile.flag)
      .filter((flag) => enabledFlags.includes(flag));
    parts.push(...orderedFlags);
    const targets = buildTargets(targetA, targetB);
    if (targets.trim()) {
      parts.push(targets);
    }
    return parts.join(' ');
  }, [iface, enabledFlags, targetA, targetB]);

  const copyCommand = async () => {
    if (disabled) return;
    try {
      await navigator.clipboard.writeText(command);
    } catch (error) {
      console.error('Unable to copy command', error);
    }
  };

  return (
    <section className="space-y-3 p-4 border rounded bg-gray-900 text-white" aria-label="Command builder">
      <header>
        <h2 className="text-lg font-semibold">Command Builder</h2>
        <p className="text-xs text-gray-300">
          Build simulation-only Ettercap commands. Nothing runs on your host; copy the
          command string into lab notebooks instead.
        </p>
      </header>
      <div className="flex flex-wrap gap-3 items-center text-sm">
        <label htmlFor="interface-select">Interface</label>
        <select
          id="interface-select"
          className="px-2 py-1 rounded text-black"
          value={iface}
          onChange={(event) => setIface(event.target.value)}
          disabled={disabled}
        >
          {INTERFACES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div>
        <h3 className="font-semibold text-sm">Modes &amp; plugins</h3>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {ATTACK_PROFILES.map((profile) => (
            <label key={profile.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabledFlags.includes(profile.flag)}
                onChange={() => toggleFlag(profile.flag)}
                disabled={disabled}
              />
              {profile.label}
            </label>
          ))}
          {EXTRA_FLAGS.map((extra) => (
            <label key={extra.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabledFlags.includes(extra.flag)}
                onChange={() => toggleFlag(extra.flag)}
                disabled={disabled}
              />
              {extra.label}
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <label className="text-sm">
          Target A
          <input
            className="mt-1 w-full px-2 py-1 rounded text-black"
            value={targetA}
            onChange={(event) => setTargetA(event.target.value)}
            placeholder="/victim/"
            disabled={disabled}
          />
        </label>
        <label className="text-sm">
          Target B
          <input
            className="mt-1 w-full px-2 py-1 rounded text-black"
            value={targetB}
            onChange={(event) => setTargetB(event.target.value)}
            placeholder="/gateway/"
            disabled={disabled}
          />
        </label>
      </div>
      <div>
        <label htmlFor="lab-notes" className="text-sm">
          Notes (saved with your copy)
        </label>
        <textarea
          id="lab-notes"
          className="mt-1 w-full h-16 px-2 py-1 rounded text-black"
          value={customNotes}
          onChange={(event) => setCustomNotes(event.target.value)}
          placeholder="Highlight lab goals or explain why a plugin is enabled."
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <div className="font-mono bg-black text-green-400 p-3 rounded" aria-label="Command preview">
          {command}
          {customNotes && (
            <span className="block text-xs text-gray-300 mt-1">
              # Notes: {customNotes}
            </span>
          )}
        </div>
        <button
          type="button"
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
          onClick={copyCommand}
          disabled={disabled}
        >
          Copy command
        </button>
      </div>
      <p className="text-xs text-yellow-300">
        Commands stay inside this simulation. Review local policy before running
        Ettercap on production networks.
      </p>
    </section>
  );
};

export default CommandBuilder;
