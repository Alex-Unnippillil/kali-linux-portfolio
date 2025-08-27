import React from 'react';
import usePersistentState from '../../../../usePersistentState';

interface TutorialOverlayProps {
  gameId: string;
  onClose: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ gameId, onClose }) => {
  const [bindings] = usePersistentState(`${gameId}-keys`, {} as Record<string, string>);
  const entries = Object.entries(bindings as Record<string, string>);

  const dontShowAgain = () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`hide_tutorial_${gameId}`, '1');
      }
    } catch {
      // ignore
    }
    onClose();
  };

  return (
    <div
      className="absolute inset-0 bg-black bg-opacity-75 text-white flex items-center justify-center z-50 transition-opacity duration-300 motion-reduce:transition-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-md p-4 bg-gray-800 rounded shadow-lg">
        <h2 className="text-xl font-bold mb-3">How to Play</h2>
        {entries.length > 0 && (
          <ul className="mb-4 space-y-1">
            {entries.map(([action, key]) => (
              <li key={action}>
                <kbd className="px-1 py-0.5 bg-gray-700 rounded mr-2">{key}</kbd>
                {action}
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-700 rounded focus:outline-none focus:ring"
            autoFocus
          >
            Dismiss
          </button>
          <button
            onClick={dontShowAgain}
            className="px-3 py-1 bg-gray-700 rounded focus:outline-none focus:ring"
          >
            Don't show again
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
