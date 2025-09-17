import { forwardRef } from 'react';
import { IconBase } from './IconBase';
import type { IconProps } from './IconBase';

const stroke = { vectorEffect: 'non-scaling-stroke' } as const;

export const CloseIcon = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
  <IconBase ref={ref} {...props}>
    <path d="M7 7L17 17" {...stroke} />
    <path d="M17 7L7 17" {...stroke} />
  </IconBase>
));
CloseIcon.displayName = 'CloseIcon';

export const MinimizeIcon = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
  <IconBase ref={ref} {...props}>
    <path d="M6 15H18" {...stroke} />
  </IconBase>
));
MinimizeIcon.displayName = 'MinimizeIcon';

export const MaximizeIcon = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
  <IconBase ref={ref} {...props}>
    <rect x="6.75" y="6.75" width="10.5" height="10.5" rx="1.5" {...stroke} />
  </IconBase>
));
MaximizeIcon.displayName = 'MaximizeIcon';

export const RestoreIcon = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
  <IconBase ref={ref} {...props}>
    <rect x="8" y="9" width="9" height="9" rx="1.5" {...stroke} />
    <path d="M7 13V8.5A1.5 1.5 0 0 1 8.5 7H13" {...stroke} />
    <path d="M11 7H15.5A1.5 1.5 0 0 1 17 8.5V13" {...stroke} />
  </IconBase>
));
RestoreIcon.displayName = 'RestoreIcon';

export const PinIcon = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
  <IconBase ref={ref} {...props}>
    <path d="M12 20.5Q7.5 15.5 7.5 12a4.5 4.5 0 1 1 9 0q0 3.5-4.5 8.5Z" {...stroke} />
    <circle cx="12" cy="11.5" r="1.75" {...stroke} />
  </IconBase>
));
PinIcon.displayName = 'PinIcon';
