import React from 'react';

export type IconName = 'close' | 'minimize' | 'maximize' | 'menu' | 'grid';

interface IconProps {
  name: IconName;
  /**
   * Icon base size in pixels
   */
  size?: 20 | 24;
  /**
   * Device pixel ratio: 1x = 24px, 2x = 48px, 3x = 72px
   */
  scale?: 1 | 2 | 3;
  className?: string;
}

const paths: Record<IconName, React.ReactNode> = {
  close: (
    <>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </>
  ),
  minimize: <line x1="5" y1="12" x2="19" y2="12" />,
  maximize: <rect x="5" y="5" width="14" height="14" rx="2" ry="2" />,
  menu: (
    <>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </>
  ),
};

export function Icon({ name, size = 24, scale = 1, className }: IconProps) {
  const pixelSize = size * scale;
  const strokeWidth = size === 20 ? 1.5 : 2;
  const baseClass = size === 20 ? 'w-5 h-5' : 'w-6 h-6';
  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      className={`${baseClass} ${className || ''}`.trim()}
    >
      {paths[name]}
    </svg>
  );
}

