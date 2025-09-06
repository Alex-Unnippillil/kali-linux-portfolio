import React, { useState } from 'react';
import bulkRename from '../../lib/bulkRename';

export interface BulkRenameDialogProps {
  /** Original file names that will be renamed */
  files: string[];
  /** Called with the new names when the user confirms */
  onRename: (names: string[]) => void;
  /** Called when the dialog should be closed without renaming */
  onCancel?: () => void;
}

/**
 * Dialog used by the Thunar file manager for performing bulk rename
 * operations. Users can provide a template string containing `#`
 * characters as placeholders for incrementing numbers. A preview of
 * the resulting file names is shown while typing.
 */
const BulkRenameDialog: React.FC<BulkRenameDialogProps> = ({
  files,
  onRename,
  onCancel,
}) => {
  const [template, setTemplate] = useState('');

  const preview = template ? bulkRename(files, { template }) : files;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRename(preview);
  };

  return (
    <div className="p-4 bg-gray-800 text-white rounded shadow-lg w-96">
      <form onSubmit={handleSubmit}>
        <h2 className="text-lg font-bold mb-3">Bulk Rename</h2>
        <label htmlFor="bulk-rename-template" className="block text-sm mb-2">
          Template
        </label>
        <input
          id="bulk-rename-template"
          type="text"
          aria-label="Template"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder="e.g. file_##.txt"
          className="w-full mb-2 p-1 text-black rounded"
        />
        <ul className="max-h-40 overflow-auto mb-3 text-sm">
          {preview.map((name, i) => (
            <li key={i} className="flex justify-between">
              <span>{files[i]}</span>
              <span className="text-green-400">{name}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500"
          >
            Rename
          </button>
        </div>
      </form>
    </div>
  );
};

export default BulkRenameDialog;
