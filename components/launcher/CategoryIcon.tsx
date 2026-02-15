import Image from 'next/image';

export type CategoryIconProps = {
  /** Name of the category icon to load. */
  name: string;
  /** Pixel size for the rendered icon. Defaults to 24. */
  size?: number;
  /** Optional className passed to the underlying Image. */
  className?: string;
};

/**
 * Renders a static category icon from `/public/images/icons` with
 * explicit dimensions to prevent layout shift.
 */
export default function CategoryIcon({
  name,
  size = 24,
  className,
}: CategoryIconProps) {
  return (
    <Image
      src={`/images/icons/${name}.svg`}
      alt={name}
      width={size}
      height={size}
      className={className}
    />
  );
}
