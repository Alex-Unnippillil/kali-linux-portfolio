import { forwardRef } from 'react';
import { IconBase } from './IconBase';
import type { IconProps } from './IconBase';

const stroke = { vectorEffect: 'non-scaling-stroke' } as const;

export const WifiIcon = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
  <IconBase ref={ref} {...props}>
    <path d="M4.5 10.5a11 11 0 0 1 15 0" {...stroke} />
    <path d="M7.5 13.5a6.5 6.5 0 0 1 9 0" {...stroke} />
    <path d="M10.5 16.5a2.75 2.75 0 0 1 3 0" {...stroke} />
    <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
  </IconBase>
));
WifiIcon.displayName = 'WifiIcon';

export const WifiOffIcon = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
  <IconBase ref={ref} {...props}>
    <path d="M5.25 11.25a11 11 0 0 1 12-2.25" {...stroke} />
    <path d="M8.25 14.25a6.5 6.5 0 0 1 7-1.5" {...stroke} />
    <path d="M11.25 17.25a2.5 2.5 0 0 1 1.5.5" {...stroke} />
    <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    <path d="M6 6L18 18" {...stroke} />
  </IconBase>
));
WifiOffIcon.displayName = 'WifiOffIcon';

export const VolumeIcon = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
  <IconBase ref={ref} {...props}>
    <path d="M6.75 10.25H9l4-3.25v10l-4-3.25H6.75Z" {...stroke} />
    <path d="M15.75 9.75a3 3 0 0 1 0 4.5" {...stroke} />
    <path d="M17.5 8.25a5 5 0 0 1 0 7.5" {...stroke} />
  </IconBase>
));
VolumeIcon.displayName = 'VolumeIcon';

export const BatteryIcon = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
  <IconBase ref={ref} {...props}>
    <rect x="5" y="9" width="11.5" height="6" rx="1.5" {...stroke} />
    <path d="M16.5 11.5h2" {...stroke} />
    <path d="M8 11.5v2" {...stroke} />
    <path d="M10.75 11.5v2" {...stroke} />
    <path d="M13.5 11.5v2" {...stroke} />
  </IconBase>
));
BatteryIcon.displayName = 'BatteryIcon';
