import { forwardRef } from 'react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import type { IconProps, IconSize } from './icons';
import {
  CloseIcon as CloseGlyph,
  MaximizeIcon as MaximizeGlyph,
  MinimizeIcon as MinimizeGlyph,
  PinIcon as PinGlyph,
  RestoreIcon as RestoreGlyph,
} from './icons';

const DEFAULT_SIZE: IconSize = 16;

type GlyphComponent = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

const withDefaultSize = (Component: GlyphComponent, displayName: string) => {
  const Wrapped = forwardRef<SVGSVGElement, IconProps>(({ size, ...rest }, ref) => (
    <Component ref={ref} size={size ?? DEFAULT_SIZE} {...rest} />
  ));
  Wrapped.displayName = displayName;
  return Wrapped;
};

export const CloseIcon = withDefaultSize(CloseGlyph, 'CloseIcon');
export const MinimizeIcon = withDefaultSize(MinimizeGlyph, 'MinimizeIcon');
export const MaximizeIcon = withDefaultSize(MaximizeGlyph, 'MaximizeIcon');
export const RestoreIcon = withDefaultSize(RestoreGlyph, 'RestoreIcon');
export const PinIcon = withDefaultSize(PinGlyph, 'PinIcon');
