import React, { useState } from 'react';
import gamepad, { ButtonEvent } from '../../../../../utils/gamepad';

interface Props {
  mapping: Record<string, string>;
  setKey: (action: string, key: string) => string | null;
  actions: Record<string, string>;
}

const formatKey = (key?: string) =>
  key?.startsWith('gp') ? `GP${key.slice(2)}` : key;

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
      gamepad.off('button', gpHandler);
      gamepad.stop();
    };
    const gpHandler = (e: ButtonEvent) => {
      const key = `gp${e.index}`;
      const conflict = setKey(action, key);
      if (conflict) setMessage(`Replaced ${conflict}`);
      else setMessage(null);
      setWaiting(null);
      window.removeEventListener('keydown', handler);
      gamepad.off('button', gpHandler);
      gamepad.stop();
    };
    window.addEventListener('keydown', handler);
    gamepad.on('button', gpHandler);
    gamepad.start();
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
            {waiting === action ? 'Press key...' : formatKey(mapping[action])}
          </button>
        </div>
      ))}
      {message && <div className="text-sm text-yellow-300">{message}</div>}
    </div>
  );
};

export default InputRemap;
