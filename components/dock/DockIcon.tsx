import React from 'react';
import Image from 'next/image';

export interface DockIconProps {
  /** Path to the icon image */
  src: string;
  /** Accessible label for the icon */
  alt: string;
  /** Whether the application is currently running */
  active?: boolean;
}

const DockIcon: React.FC<DockIconProps> = ({ src, alt, active = false }) => {
  return (
    <div className="relative flex items-center justify-center">
      <Image
        src={src}
        alt={alt}
        width={28}
        height={28}
        className="w-7 h-7"
        sizes="28px"
      />
      {active && (
        <span
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white dark:bg-black border border-black dark:border-white"
        />
      )}
    </div>
  );
};

export default DockIcon;

