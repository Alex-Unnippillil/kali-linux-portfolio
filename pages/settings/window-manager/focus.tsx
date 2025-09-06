"use client";

import { useFocusModeSetting, useRaiseOnFocusSetting } from '../../../hooks/usePersistentState';

export default function FocusSettings() {
  const [mode, setMode] = useFocusModeSetting();
  const [raise, setRaise] = useRaiseOnFocusSetting();

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">Focus</h1>
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="focus-mode"
            value="click"
            checked={mode === 'click'}
            onChange={() => setMode('click')}
          />
          <span>Click to focus</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="focus-mode"
            value="sloppy"
            checked={mode === 'sloppy'}
            onChange={() => setMode('sloppy')}
          />
          <span>Focus follows mouse (sloppy)</span>
        </label>
        <label className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            checked={raise}
            onChange={(e) => setRaise(e.target.checked)}
          />
          <span>Raise on focus</span>
        </label>
      </div>
    </div>
  );
}
