'use client';

import React, { useState } from 'react';

export interface NetworkConnection {
  type: 'Ethernet' | 'Bridge' | 'VLAN';
  name: string;
  interface?: string;
  interfaces?: string;
  parent?: string;
  vlanId?: string;
}

interface Props {
  onSave: (conn: NetworkConnection) => void;
  onCancel: () => void;
}

const AddConnectionDialog: React.FC<Props> = ({ onSave, onCancel }) => {
  const [type, setType] = useState<'Ethernet' | 'Bridge' | 'VLAN'>('Ethernet');
  const [name, setName] = useState('');
  const [iface, setIface] = useState('');
  const [bridgeIfaces, setBridgeIfaces] = useState('');
  const [parent, setParent] = useState('');
  const [vlanId, setVlanId] = useState('');

  const save = () => {
    const base = { type, name };
    let conn: NetworkConnection;
    if (type === 'Bridge') {
      conn = { ...base, interfaces: bridgeIfaces };
    } else if (type === 'VLAN') {
      conn = { ...base, parent, vlanId };
    } else {
      conn = { ...base, interface: iface };
    }
    onSave(conn);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70">
      <div className="w-72 rounded bg-ub-cool-grey p-4 text-white">
        <h2 className="mb-2 text-lg font-bold">Add Connection</h2>
        <div className="mb-2">
          <label className="block text-sm">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full rounded bg-gray-800 p-1"
          >
            <option value="Ethernet">Ethernet</option>
            <option value="Bridge">Bridge</option>
            <option value="VLAN">VLAN</option>
          </select>
        </div>
        <div className="mb-2">
          <label className="block text-sm">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded bg-gray-800 p-1"
          />
        </div>
        {type === 'Ethernet' && (
          <div className="mb-2">
            <label className="block text-sm">Interface</label>
            <input
              value={iface}
              onChange={(e) => setIface(e.target.value)}
              className="w-full rounded bg-gray-800 p-1"
            />
          </div>
        )}
        {type === 'Bridge' && (
          <div className="mb-2">
            <label className="block text-sm">Interfaces</label>
            <input
              value={bridgeIfaces}
              onChange={(e) => setBridgeIfaces(e.target.value)}
              className="w-full rounded bg-gray-800 p-1"
              placeholder="e.g. eth0,eth1"
            />
          </div>
        )}
        {type === 'VLAN' && (
          <>
            <div className="mb-2">
              <label className="block text-sm">Parent Interface</label>
              <input
                value={parent}
                onChange={(e) => setParent(e.target.value)}
                className="w-full rounded bg-gray-800 p-1"
              />
            </div>
            <div className="mb-2">
              <label className="block text-sm">VLAN ID</label>
              <input
                value={vlanId}
                onChange={(e) => setVlanId(e.target.value)}
                className="w-full rounded bg-gray-800 p-1"
              />
            </div>
          </>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded bg-gray-700 px-2 py-1"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="rounded bg-ubt-blue px-2 py-1"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddConnectionDialog;

