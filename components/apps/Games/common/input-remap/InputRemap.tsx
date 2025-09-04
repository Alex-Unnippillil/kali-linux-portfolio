import React, { useState } from 'react';
import { gamepad, ButtonEvent } from '../../../../../utils/gamepad';

interface Binding {
  key?: string;
  pad?: number;
}

interface Props {
  mapping: Record<string, Binding>;
  setKey: (action: string, bind: Binding) => string | null;
  actions: Record<string, Binding>;
}

const InputRemap: React.FC<Props> = ({ mapping, setKey, actions }) => {
  const [waiting, setWaiting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const capture = (action: string) => {
    setWaiting(action);
    setMessage(null);
    const keyHandler = (e: KeyboardEvent) => {
      e.preventDefault();
      const conflict = setKey(action, { key: e.key });
      if (conflict) setMessage(`Replaced ${conflict}`);
      else setMessage(null);
      setWaiting(null);
      window.removeEventListener('keydown', keyHandler);
      gamepad.off('button', padHandler);
    };
    const padHandler = (e: ButtonEvent) => {
      if (!e.pressed) return;
      const conflict = setKey(action, { pad: e.index });
      if (conflict) setMessage(`Replaced ${conflict}`);
      else setMessage(null);
      setWaiting(null);
      window.removeEventListener('keydown', keyHandler);
      gamepad.off('button', padHandler);
    };
    window.addEventListener('keydown', keyHandler);
    gamepad.on('button', padHandler);
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
            {waiting === action
              ? 'Press key or button...'
              : `${mapping[action]?.key ?? '-'}${mapping[action]?.pad !== undefined ? ` / B${mapping[action].pad}` : ''}`}
          </button>
        </div>
      ))}
      {message && <div className="text-sm text-yellow-300">{message}</div>}
    </div>
  );
};

export default InputRemap;
