import React, { useState } from 'react';

const PortPresetsEditor = ({
  presets,
  errors = {},
  onCreate,
  onRename,
  onUpdatePorts,
  onDelete,
  onImport,
  onExport,
}) => {
  const [importText, setImportText] = useState('');
  const [exportText, setExportText] = useState('');

  const handleCreate = () => {
    onCreate?.();
  };

  const handleRename = (id, value) => {
    onRename?.(id, value);
  };

  const handlePortsChange = (id, value) => {
    onUpdatePorts?.(id, value);
  };

  const handleDelete = (id) => {
    onDelete?.(id);
  };

  const handleImport = () => {
    if (!onImport) return;
    const success = onImport(importText);
    if (success) {
      setImportText('');
    }
  };

  const handleExport = async () => {
    if (!onExport) return;
    const data = await onExport();
    if (data) {
      const text =
        typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      setExportText(text);
    }
  };

  return (
    <div className="mt-4 p-3 rounded bg-ub-grey text-black">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Custom port presets</h3>
        <button
          type="button"
          onClick={handleCreate}
          className="px-2 py-1 rounded bg-black text-white text-xs focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow"
        >
          Add preset
        </button>
      </div>
      <div className="space-y-3">
        {presets.length === 0 && (
          <p className="text-xs text-gray-700">No custom presets yet.</p>
        )}
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="border border-gray-500 rounded p-2 bg-white text-black"
          >
            <label
              className="block text-xs font-semibold text-gray-700"
              htmlFor={`preset-name-${preset.id}`}
            >
              Preset name
            </label>
            <input
              id={`preset-name-${preset.id}`}
              aria-label="Preset name"
              value={preset.name}
              onChange={(e) => handleRename(preset.id, e.target.value)}
              className="w-full mt-1 mb-2 p-1 border border-gray-400 rounded"
            />
            <label
              className="block text-xs font-semibold text-gray-700"
              htmlFor={`preset-ports-${preset.id}`}
            >
              Preset ports
            </label>
            <input
              id={`preset-ports-${preset.id}`}
              aria-label="Preset ports"
              value={preset.ports}
              onChange={(e) => handlePortsChange(preset.id, e.target.value)}
              className="w-full mt-1 p-1 border border-gray-400 rounded"
              placeholder="e.g. 22,80,443 or 1-1024"
            />
            {errors[preset.id] && (
              <p className="mt-1 text-xs text-red-700" role="alert">
                {errors[preset.id]}
              </p>
            )}
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleDelete(preset.id)}
                className="px-2 py-1 text-xs rounded bg-red-600 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
              >
                Delete preset
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <label
          className="block text-xs font-semibold text-gray-800"
          htmlFor="port-preset-import"
        >
          Import presets JSON
        </label>
        <textarea
          id="port-preset-import"
          aria-label="Import presets JSON"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={3}
          className="w-full mt-1 p-2 rounded border border-gray-400"
          placeholder='[ { "name": "Web", "ports": "80,443" } ]'
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleImport}
          className="px-2 py-1 rounded bg-black text-white text-xs focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow"
        >
          Import JSON
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="px-2 py-1 rounded bg-black text-white text-xs focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow"
        >
          Export JSON
        </button>
      </div>
      {exportText && (
        <div className="mt-2">
          <label
            className="block text-xs font-semibold text-gray-800"
            htmlFor="port-preset-export"
          >
            Export preview
          </label>
          <textarea
            id="port-preset-export"
            aria-label="Export presets JSON"
            value={exportText}
            readOnly
            rows={3}
            className="w-full mt-1 p-2 rounded border border-gray-400 bg-gray-100"
          />
        </div>
      )}
    </div>
  );
};

export default PortPresetsEditor;
