import React, { useState } from 'react';
import { formatGameKey } from '../../../../../utils/gameInput';

interface Props {
  mapping: Record<string, string>;
  setKey: (action: string, key: string) => string | null;
  actions: Record<string, string>;
}

const InputRemap: React.FC<Props> = ({ mapping, setKey, actions }) => {
  const [waiting, setWaiting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const capture = (action: string) => {
    setWaiting(action);
    setMessage(null);
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const conflict = setKey(action, e.key);
      if (conflict) setMessage(`Replaced ${conflict}`);
      else setMessage(null);
      setWaiting(null);
      window.removeEventListener('keydown', handler);
    };
    window.addEventListener('keydown', handler);
  };

  return (
    <div className="space-y-2">
      {Object.keys(actions).map((action) => (
        <div key={action} className="flex items-center justify-between">
          <span className="mr-2 capitalize">{action}</span>
          <button
            type="button"
            onClick={() => capture(action)}
            className="px-2 py-1 bg-gray-700 rounded focus:outline-none focus:ring"
          >
            {waiting === action ? 'Press key...' : formatGameKey(mapping[action])}
          </button>
        </div>
      ))}
      {message && <div className="text-sm text-yellow-300">{message}</div>}
    </div>
  );
};

export default InputRemap;
