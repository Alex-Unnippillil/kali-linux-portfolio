import React from 'react';
import Image from 'next/image';
import SmallArrow from './small_arrow';
import { useSettings } from '../../hooks/useSettings';
import NetworkTrayIcon from './network-tray-icon';

const VOLUME_ICON = '/themes/Yaru/status/audio-volume-medium-symbolic.svg';

export default function Status() {
  const { allowNetwork } = useSettings();

  return (
    <div className="flex justify-center items-center">
      <NetworkTrayIcon allowNetwork={allowNetwork} className="mx-1.5" />
      <span className="mx-1.5">
        <Image
          width={16}
          height={16}
          src={VOLUME_ICON}
          alt="volume"
          className="inline status-symbol w-4 h-4"
          sizes="16px"
        />
      </span>
      <span className="mx-1.5">
        <Image
          width={16}
          height={16}
          src="/themes/Yaru/status/battery-good-symbolic.svg"
          alt="ubuntu battery"
          className="inline status-symbol w-4 h-4"
          sizes="16px"
        />
      </span>
      <span className="mx-1">
        <SmallArrow angle="down" className=" status-symbol" />
      </span>
    </div>
  );
}
