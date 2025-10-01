import clsx from 'clsx';
import Image from 'next/image';

import {
  DEFAULT_ICON_SIZE,
  ICON_NAMES,
  type IconName,
  type IconSize,
  getIconDefinition,
  resolveIconPath,
  resolveIconSize,
} from '@/lib/iconManifest';

type IconProps = {
  name: IconName;
  size?: number | IconSize;
  alt?: string;
  className?: string;
  decorative?: boolean;
};

const Icon = ({ name, size, alt, className, decorative = false }: IconProps) => {
  const resolvedSize = resolveIconSize(size);
  const meta = getIconDefinition(name);
  const ariaHidden = decorative ? true : undefined;
  const role = decorative ? 'presentation' : undefined;
  const resolvedAlt = decorative ? '' : alt ?? meta.label ?? name;

  return (
    <Image
      src={resolveIconPath(name, resolvedSize)}
      alt={resolvedAlt}
      width={resolvedSize}
      height={resolvedSize}
      className={clsx('inline-block', className)}
      aria-hidden={ariaHidden}
      role={role}
      priority={resolvedSize >= 128}
    />
  );
};

export type { IconProps, IconName, IconSize };

export { DEFAULT_ICON_SIZE, ICON_NAMES };

export default Icon;
