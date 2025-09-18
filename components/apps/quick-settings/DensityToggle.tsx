import React, { useCallback } from 'react';
import ToggleSwitch from '../../ToggleSwitch';
import { useDesktop } from '../../core/DesktopProvider';

const DensityToggle: React.FC = () => {
  const { densityLock, setDensityLock, tokens, pointerType } = useDesktop();
  const locked = densityLock === 'touch';

  const onToggle = useCallback(
    (checked: boolean) => {
      setDensityLock(checked ? 'touch' : 'auto');
    },
    [setDensityLock],
  );

  return (
    <div
      className={`flex items-center justify-between rounded-md ${tokens.inlineGap} ${tokens.control}`.trim()}
    >
      <div className="flex flex-col">
        <span className={`font-medium ${tokens.text}`.trim()}>Touch targets</span>
        <span className={`text-ubt-grey ${tokens.subtleText}`.trim()}>
          {locked ? 'Locked to touch-friendly layout' : `Auto (${pointerType})`}
        </span>
      </div>
      <ToggleSwitch
        checked={locked}
        onChange={onToggle}
        ariaLabel="Toggle touch target lock"
        className="ml-4"
      />
    </div>
  );
};

export default DensityToggle;
