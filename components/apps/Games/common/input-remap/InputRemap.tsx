import React, { useState } from 'react';

interface Props {
  mapping: Record<string, string>;
  setKey: (action: string, key: string) => string | null;
  actions: Record<string, string>;
  highlightQuery?: string;
}

const InputRemap: React.FC<Props> = ({
  mapping,
  setKey,
  actions,
  highlightQuery,
}) => {
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

  const highlightMatches = (text: string, keyPrefix: string) => {
    const trimmed = highlightQuery?.trim();
    if (!trimmed) return text;
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'ig');
    const parts = text.split(regex);
    if (parts.length === 1) return text;
    return parts.map((part, index) =>
      index % 2 === 1 ? (
        <mark
          key={`${keyPrefix}-${index}`}
          className="rounded-sm bg-yellow-300 px-0.5 text-black"
        >
          {part}
        </mark>
      ) : (
        <React.Fragment key={`${keyPrefix}-${index}`}>{part}</React.Fragment>
      ),
    );
  };

  return (
    <div className="space-y-2">
      {Object.keys(actions).map((action) => (
        <div key={action} className="flex items-center justify-between">
          <span className="mr-2 capitalize">
            {highlightMatches(action, `${action}-action`)}
          </span>
          <button
            type="button"
            onClick={() => capture(action)}
            className="px-2 py-1 bg-gray-700 rounded focus:outline-none focus:ring"
            aria-label={`Change key for ${action}`}
          >
            {waiting === action
              ? 'Press key...'
              : highlightMatches(
                  mapping[action] ?? actions[action] ?? '',
                  `${action}-key`,
                )}
          </button>
        </div>
      ))}
      {message && <div className="text-sm text-yellow-300">{message}</div>}
    </div>
  );
};

export default InputRemap;
