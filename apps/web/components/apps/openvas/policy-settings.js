import React, { useState } from 'react';

const PolicySettings = ({ policy }) => {
  const defaultConfig = {
    name: 'Full and Fast',
    portList: 'OpenVAS Default',
    maxHosts: '10 concurrent hosts',
    qod: '70% minimum',
  };
  const [config, setConfig] = useState(policy || defaultConfig);

  const handleChange = (field) => (e) =>
    setConfig({ ...config, [field]: e.target.value });

  const savePolicy = () => {
    if (typeof window !== 'undefined')
      localStorage.setItem('openvasPolicy', JSON.stringify(config));
  };

  const loadPolicy = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('openvasPolicy');
      if (stored) setConfig(JSON.parse(stored));
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-kali-surface-muted/80 p-4 text-white shadow-kali-panel backdrop-blur">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-kali-control">
        Policy Settings
      </h3>
      <ul className="space-y-1 text-sm text-white/80">
        <li>
          <span className="font-semibold text-white">Name:</span> {config.name}
        </li>
        <li>
          <span className="font-semibold text-white">Port List:</span> {config.portList}
        </li>
        <li>
          <span className="font-semibold text-white">Max Hosts:</span> {config.maxHosts}
        </li>
        <li>
          <span className="font-semibold text-white">QoD:</span> {config.qod}
        </li>
      </ul>
      <form className="mt-3 space-y-3 text-xs">
        <label className="block text-[0.7rem] font-semibold uppercase tracking-wide text-white/70">
          Policy Name
          <input
            aria-label="Policy Name"
            className="mt-1 w-full rounded-md border border-white/10 bg-kali-surface-raised/80 px-2 py-1 text-sm text-white placeholder-white/40 focus:border-kali-focus focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            value={config.name}
            onChange={handleChange('name')}
          />
        </label>
        <label className="block text-[0.7rem] font-semibold uppercase tracking-wide text-white/70">
          Port List
          <input
            aria-label="Port List"
            className="mt-1 w-full rounded-md border border-white/10 bg-kali-surface-raised/80 px-2 py-1 text-sm text-white placeholder-white/40 focus:border-kali-focus focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            value={config.portList}
            onChange={handleChange('portList')}
          />
        </label>
        <label className="block text-[0.7rem] font-semibold uppercase tracking-wide text-white/70">
          Max Hosts
          <input
            aria-label="Max Hosts"
            className="mt-1 w-full rounded-md border border-white/10 bg-kali-surface-raised/80 px-2 py-1 text-sm text-white placeholder-white/40 focus:border-kali-focus focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            value={config.maxHosts}
            onChange={handleChange('maxHosts')}
          />
        </label>
        <label className="block text-[0.7rem] font-semibold uppercase tracking-wide text-white/70">
          QoD
          <input
            aria-label="QoD"
            className="mt-1 w-full rounded-md border border-white/10 bg-kali-surface-raised/80 px-2 py-1 text-sm text-white placeholder-white/40 focus:border-kali-focus focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            value={config.qod}
            onChange={handleChange('qod')}
          />
        </label>
      </form>
      <div className="mt-3 flex gap-2 text-xs font-semibold">
        <button
          type="button"
          onClick={savePolicy}
          className="rounded-md bg-kali-primary px-3 py-1.5 text-white transition hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
        >
          Save Policy
        </button>
        <button
          type="button"
          onClick={loadPolicy}
          className="rounded-md bg-kali-control px-3 py-1.5 text-black transition hover:bg-kali-control/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
        >
          Load Policy
        </button>
      </div>
      <p className="mt-3 text-xs text-white/60">
        Sample configuration shown for demo purposes.
      </p>
    </div>
  );
};

export default PolicySettings;

