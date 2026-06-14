"use client";

import usePersistentState from '../../hooks/usePersistentState';

export type BatteryVariant = 'normal' | 'charging';

const BatteryIcon = ({ percent, variant }: { percent: number; variant: BatteryVariant }) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const innerWidth = (clamped / 100) * 16; // inner width within outer battery
  const fill = clamped < 20 ? '#f87171' : 'currentColor';

  return (
    <svg
      width="26"
      height="14"
      viewBox="0 0 26 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="battery"
      className="text-current"
    >
      <rect
        x="1"
        y="1"
        width="20"
        height="12"
        rx="2"
        ry="2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <rect x="3" y="3" width={innerWidth} height="8" fill={fill} />
      <rect x="22" y="4" width="3" height="6" rx="1" ry="1" fill="currentColor" />
      {variant === 'charging' && (
        <polygon
          points="12,3 9,7 12,7 10,11 15,6 12,6"
          fill="#000"
        />
      )}
    </svg>
  );
};

const TrayGroup = () => {
  const [percent] = usePersistentState<number>(
    'battery-percent',
    100,
    (v): v is number => typeof v === 'number',
  );
  const [variant] = usePersistentState<BatteryVariant>(
    'battery-variant',
    'normal',
    (v): v is BatteryVariant => v === 'normal' || v === 'charging',
  );

  return (
    <div className="flex items-center gap-1" aria-label="battery-status">
      <BatteryIcon percent={percent} variant={variant} />
      <span className="text-sm">{percent}%</span>
    </div>
  );
};

export default TrayGroup;
