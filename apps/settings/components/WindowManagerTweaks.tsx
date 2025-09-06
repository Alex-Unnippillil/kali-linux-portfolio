'use client';

import { useWorkspaceMargins } from '@/src/state/workspace';

export default function WindowManagerTweaks() {
  const [margins, setMargins] = useWorkspaceMargins();

  const handleChange = (side: keyof typeof margins, value: number) => {
    setMargins((prev) => ({ ...prev, [side]: value }));
  };

  return (
    <div className="p-4 space-y-2 text-ubt-grey">
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <div key={side} className="flex items-center space-x-2">
          <label htmlFor={`wm-margin-${side}`} className="capitalize">
            {side}:
          </label>
          <input
            id={`wm-margin-${side}`}
            type="number"
            min={0}
            value={margins[side]}
            onChange={(e) => handleChange(side, Number(e.target.value))}
            className="w-20 bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
          />
        </div>
      ))}
    </div>
  );
}

