import React from 'react';

export default function FilePropertiesDialog({ file, permissions, onChange, onClose }) {
  const categories = ['owner', 'group', 'other'];
  const perms = ['read', 'write', 'execute'];

  const toggle = (cat, perm) => {
    const updated = {
      ...permissions,
      [cat]: { ...permissions[cat], [perm]: !permissions[cat][perm] },
    };
    onChange(updated);
  };

  const makeExecutable = () => {
    const updated = {
      owner: { ...permissions.owner, execute: true },
      group: { ...permissions.group, execute: true },
      other: { ...permissions.other, execute: true },
    };
    onChange(updated);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-ub-cool-grey text-white p-4 rounded shadow min-w-[300px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-bold mb-2">{file?.name || 'Properties'}</div>
        <table className="w-full text-sm mb-4">
          <thead>
            <tr>
              <th className="text-left">&nbsp;</th>
              {perms.map((p) => (
                <th key={p} className="text-left capitalize">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat}>
                <td className="capitalize">{cat}</td>
                {perms.map((perm) => (
                  <td key={perm}>
                    <input
                      type="checkbox"
                      checked={permissions[cat][perm]}
                      onChange={() => toggle(cat, perm)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end space-x-2">
          <button
            className="px-2 py-1 bg-black bg-opacity-50 rounded"
            onClick={makeExecutable}
          >
            Make executable
          </button>
          <button
            className="px-2 py-1 bg-black bg-opacity-50 rounded"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

