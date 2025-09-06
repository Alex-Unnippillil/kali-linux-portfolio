"use client";

import React, { useState } from 'react';

export default function FilePropertiesDialog({ entry, perm, onClose, onSave }) {
  const [localPerm, setLocalPerm] = useState(perm);
  const [recursive, setRecursive] = useState(false);

  const toggle = (role, bit) => {
    setLocalPerm((p) => ({
      ...p,
      [role]: { ...p[role], [bit]: !p[role][bit] },
    }));
  };

  const handleSave = () => {
    onSave(localPerm, recursive);
  };

  const execChecked = localPerm.owner.x || localPerm.group.x || localPerm.other.x;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      onClick={onClose}
    >
      <div
        className="bg-ub-cool-grey p-4 rounded text-white w-72"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-bold mb-2">Permissions for {entry.name}</div>
        <table className="w-full text-center text-sm mb-2">
          <thead>
            <tr>
              <th></th>
              <th>Read</th>
              <th>Write</th>
              <th>Exec</th>
            </tr>
          </thead>
          <tbody>
            {['owner', 'group', 'other'].map((role) => (
              <tr key={role}>
                <td className="text-left capitalize">{role}</td>
                {['r', 'w', 'x'].map((bit) => (
                  <td key={bit}>
                    <input
                      type="checkbox"
                      checked={localPerm[role][bit]}
                      onChange={() => toggle(role, bit)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <label className="block mb-2">
          <input
            type="checkbox"
            checked={execChecked}
            onChange={() => toggle('owner', 'x')}
            className="mr-1"
          />
          Allow this file to run as a program
        </label>
        {entry.handle.kind === 'directory' && (
          <label className="block mb-2">
            <input
              type="checkbox"
              checked={recursive}
              onChange={(e) => setRecursive(e.target.checked)}
              className="mr-1"
            />
            Apply recursively
          </label>
        )}
        <div className="flex justify-end space-x-2 mt-3">
          <button
            onClick={onClose}
            className="px-2 py-1 bg-black bg-opacity-50 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-2 py-1 bg-black bg-opacity-50 rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
