import React from 'react';
import { getIconForMime } from './IconMapper';

interface FileInfo {
  name: string;
  mime: string;
  size?: number;
  lastModified?: number;
}

interface Props {
  file: FileInfo | null;
  onClose: () => void;
  theme: string;
}

export default function FilePropertiesModal({ file, onClose, theme }: Props) {
  if (!file) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 text-black dark:text-white p-4 rounded shadow-md min-w-[250px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center mb-3 space-x-3">
          {getIconForMime(file.mime, theme)}
          <div>
            <div className="font-bold">{file.name}</div>
            <div className="text-xs opacity-70">{file.mime || 'unknown'}</div>
          </div>
        </div>
        {typeof file.size === 'number' && (
          <div className="text-xs mb-1">Size: {file.size} bytes</div>
        )}
        {typeof file.lastModified === 'number' && (
          <div className="text-xs mb-1">
            Modified: {new Date(file.lastModified).toLocaleString()}
          </div>
        )}
        <div className="text-right mt-4">
          <button
            onClick={onClose}
            className="px-2 py-1 bg-black text-white dark:bg-white dark:text-black rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
