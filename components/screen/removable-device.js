import React from 'react';
import Image from 'next/image';

export default function RemovableDeviceIcon() {
  return (
    <div
      role="button"
      aria-label="Removable Device"
      data-context="desktop-area"
      tabIndex={0}
      className="p-1 m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 border border-transparent outline-none rounded select-none w-24 h-20 flex flex-col justify-start items-center text-center text-xs font-normal text-white transition-hover transition-active"
    >
      <Image
        width={40}
        height={40}
        className="mb-1 w-10"
        src="/themes/Yaru/status/drive-removable-media.svg"
        alt="Removable Device"
        sizes="40px"
      />
      Removable
    </div>
  );
}
