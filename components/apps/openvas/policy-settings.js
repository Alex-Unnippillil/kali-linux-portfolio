import React from 'react';

const PolicySettings = ({ policy }) => {
  const config =
    policy || {
      name: 'Full and Fast',
      portList: 'OpenVAS Default',
      maxHosts: '10 concurrent hosts',
      qod: '70% minimum',
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
      <p className="text-xs text-gray-400 mt-2">
        Sample configuration shown for demo purposes.
      </p>
    </div>
  );
};

export default PolicySettings;

