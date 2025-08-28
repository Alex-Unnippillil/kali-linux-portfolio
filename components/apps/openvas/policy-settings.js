import React from 'react';

const PolicySettings = () => {
  const policy = {
    name: 'Full and Fast',
    portList: 'OpenVAS Default',
    maxHosts: '10 concurrent hosts',
    qod: '70% minimum',
  };
  return (
    <div className="p-4 bg-gray-800 rounded mb-4">
      <h3 className="text-md font-bold mb-2">Policy Settings</h3>
      <ul className="text-sm space-y-1">
        <li><span className="font-semibold">Name:</span> {policy.name}</li>
        <li><span className="font-semibold">Port List:</span> {policy.portList}</li>
        <li><span className="font-semibold">Max Hosts:</span> {policy.maxHosts}</li>
        <li><span className="font-semibold">QoD:</span> {policy.qod}</li>
      </ul>
      <p className="text-xs text-gray-400 mt-2">
        Sample configuration shown for demo purposes.
      </p>
    </div>
  );
};

export default PolicySettings;

