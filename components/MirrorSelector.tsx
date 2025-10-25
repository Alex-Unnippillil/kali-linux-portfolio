import React from 'react';
import useMirrorOverride from '../hooks/useMirrorOverride';

export interface MirrorOption {
  url: string;
  name?: string;
}

export function MirrorSelector({ mirrors }: { mirrors: MirrorOption[] }) {
  const { override, setOverride, reset } = useMirrorOverride();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      setOverride(val);
    } else {
      reset();
    }
  };

  return (
    <div>
      <select aria-label="mirror-select" value={override ?? ''} onChange={handleChange}>
        <option value="">Auto</option>
        {mirrors.map((m) => (
          <option key={m.url} value={m.url}>
            {m.name || m.url}
          </option>
        ))}
      </select>
      {override && (
        <button aria-label="reset-mirror" onClick={reset}>
          Reset
        </button>
      )}
    </div>
  );
}

export default MirrorSelector;
