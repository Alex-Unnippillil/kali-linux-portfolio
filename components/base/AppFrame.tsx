import Image from 'next/image';
import React from 'react';

type AppFrameProps = {
  title: string;
  icon?: string;
};

const normalizeIcon = (icon?: string) => {
  if (!icon) return undefined;
  return icon.startsWith('./') ? icon.replace('./', '/') : icon;
};

const AppFrame: React.FC<AppFrameProps> = ({ title, icon }) => {
  const normalizedIcon = normalizeIcon(icon);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-ub-cool-grey text-white">
      {normalizedIcon ? (
        <Image
          src={normalizedIcon}
          alt={`${title} icon`}
          width={48}
          height={48}
          className="h-12 w-12"
          sizes="48px"
        />
      ) : null}
      <p className="text-sm font-medium tracking-wide opacity-80">
        {`Launching ${title}…`}
      </p>
    </div>
  );
};

export default AppFrame;
