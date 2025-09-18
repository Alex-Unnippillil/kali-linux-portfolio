import React from 'react';
import { Icon as GlyphIcon, IconProps as GlyphIconProps, normalizeIconSize, resolveIconName } from '../icons';

export interface IconProps extends Omit<GlyphIconProps, 'size' | 'name'> {
  name?: string;
  size?: number;
}

const Icon: React.FC<IconProps> = ({ name, size, title, className }) => {
  const normalizedName = resolveIconName(name);
  const normalizedSize = normalizeIconSize(size);
  return <GlyphIcon name={normalizedName} size={normalizedSize} title={title} className={className} />;
};

export default Icon;
export { resolveIconName, normalizeIconSize };
