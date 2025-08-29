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
    <div className="p-4 bg-gray-800 rounded mb-4">
      <h3 className="text-md font-bold mb-2">Policy Settings</h3>
      <ul className="text-sm space-y-1">
        <li>
          <span className="font-semibold">Name:</span> {config.name}
        </li>
        <li>
          <span className="font-semibold">Port List:</span> {config.portList}
        </li>
        <li>
          <span className="font-semibold">Max Hosts:</span> {config.maxHosts}
        </li>
        <li>
          <span className="font-semibold">QoD:</span> {config.qod}
        </li>
      </ul>
      <form className="mt-2 space-y-2">
        <label className="block text-xs">
          Policy Name
          <input
            aria-label="Policy Name"
            className="w-full p-1 rounded text-black"
            value={config.name}
            onChange={handleChange('name')}
          />
        </label>
        <label className="block text-xs">
          Port List
          <input
            aria-label="Port List"
            className="w-full p-1 rounded text-black"
            value={config.portList}
            onChange={handleChange('portList')}
          />
        </label>
        <label className="block text-xs">
          Max Hosts
          <input
            aria-label="Max Hosts"
            className="w-full p-1 rounded text-black"
            value={config.maxHosts}
            onChange={handleChange('maxHosts')}
          />
        </label>
        <label className="block text-xs">
          QoD
          <input
            aria-label="QoD"
            className="w-full p-1 rounded text-black"
            value={config.qod}
            onChange={handleChange('qod')}
          />
        </label>
      </form>
      <div className="flex gap-2 mt-2 text-xs">
        <button
          type="button"
          onClick={savePolicy}
          className="px-2 py-1 bg-blue-600 rounded"
        >
          Save Policy
        </button>
        <button
          type="button"
          onClick={loadPolicy}
          className="px-2 py-1 bg-green-600 rounded"
        >
          Load Policy
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Sample configuration shown for demo purposes.
      </p>
    </div>
  );
};

export default PolicySettings;

