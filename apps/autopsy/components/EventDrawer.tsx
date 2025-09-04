'use client';

import React, { useEffect, useState } from 'react';
import { Artifact } from '../types';
import copyToClipboard from '../../../utils/clipboard';

interface EventDrawerProps {
  artifact: Artifact | null;
  onClose: () => void;
}

const EventDrawer: React.FC<EventDrawerProps> = ({ artifact, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (artifact) {
      setVisible(true);
    }
  }, [artifact]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const copy = (text: string) => {
    if (text) {
      copyToClipboard(text);
    }
  };

  if (!artifact && !visible) return null;

  return (
    <div
      className={`fixed top-0 right-0 h-full w-64 bg-ub-grey p-4 overflow-y-auto transform transition-transform duration-300 ${
        visible ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <button onClick={handleClose} className="mb-2 text-right w-full">
        Close
      </button>
      {artifact && (
        <>
          <div className="font-bold break-words">{artifact.name}</div>
          {artifact.type && <div className="text-gray-400">{artifact.type}</div>}
          {artifact.timestamp && (
            <div className="text-xs">
              {new Date(artifact.timestamp).toLocaleString()}
            </div>
          )}
          {artifact.description && (
            <div className="text-xs">{artifact.description}</div>
          )}
          {artifact.plugin && (
            <div className="text-xs">Plugin: {artifact.plugin}</div>
          )}
          {artifact.user && <div className="text-xs">User: {artifact.user}</div>}
          {artifact.size !== undefined && (
            <div className="text-xs">Size: {artifact.size}</div>
          )}

          <div className="mt-2 text-xs break-all">
            <div className="mb-2">
              <div>Path:</div>
              <div className="flex items-center gap-1">
                <span className="flex-1">{artifact.path || 'Unknown'}</span>
                <button
                  onClick={() => copy(artifact.path || '')}
                  className="bg-ub-orange text-black px-1 rounded"
                >
                  Copy
                </button>
              </div>
            </div>
            <div>
              <div>Hash:</div>
              <div className="flex items-center gap-1">
                <span className="flex-1">{artifact.hash || 'Unknown'}</span>
                <button
                  onClick={() => copy(artifact.hash || '')}
                  className="bg-ub-orange text-black px-1 rounded"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EventDrawer;
