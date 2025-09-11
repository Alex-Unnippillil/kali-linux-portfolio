import React, { useState, useEffect } from 'react';

interface Props {
  item: {
    name: string;
    kind: 'file' | 'directory';
    size?: number;
    modified?: number;
    type?: string;
    preview?: string;
    handle: any;
  };
  onClose: () => void;
  onRenamed?: (newName: string) => void;
}

const PropertiesDialog: React.FC<Props> = ({ item, onClose, onRenamed }) => {
  const [name, setName] = useState(item.name);

  useEffect(() => {
    return () => {
      if (item.preview) URL.revokeObjectURL(item.preview);
    };
  }, [item.preview]);

  const save = async () => {
    if (name !== item.name && item.handle?.move) {
      try {
        await item.handle.move(name);
        onRenamed?.(name);
      } catch {
        // ignore rename errors
      }
    }
  };

  const iconSrc =
    item.preview ||
    (item.kind === 'directory'
      ? '/themes/Yaru/system/folder.png'
      : '/themes/Yaru/system/user-home.png');

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-ub-cool-grey p-4 rounded shadow-md text-white w-64">
        <div className="flex items-center mb-4">
          <img src={iconSrc} alt="" className="w-12 h-12 mr-2 object-cover" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 bg-transparent border-b border-gray-500 focus:outline-none"
            aria-label="Name"
          />
        </div>
        <div className="space-y-1 text-sm">
          <div>Type: {item.kind === 'directory' ? 'Directory' : item.type || 'File'}</div>
          {item.size !== undefined && <div>Size: {item.size} bytes</div>}
          {item.modified !== undefined && (
            <div>Modified: {new Date(item.modified).toLocaleString()}</div>
          )}
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button onClick={onClose} className="px-2 py-1 bg-black bg-opacity-50 rounded">
            Close
          </button>
          <button onClick={save} className="px-2 py-1 bg-black bg-opacity-50 rounded">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertiesDialog;

