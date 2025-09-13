import React from "react";
import Image from 'next/image';
import SmallArrow from "./small_arrow";

export default function Status() {
  return (
    <div className="flex justify-center items-center">
      <span className="mx-1.5">
        <Image
          width={16}
          height={16}
          src="/themes/Yaru/status/network-wireless-signal-good-symbolic.svg"
          alt="ubuntu wifi"
          className="inline status-symbol w-4 h-4"
          sizes="16px"
        />
      </span>
      <span className="mx-1.5">
        <Image
          width={16}
          height={16}
          src="/themes/Yaru/status/audio-volume-medium-symbolic.svg"
          alt="ubuntu sound"
          className="inline status-symbol w-4 h-4"
          sizes="16px"
        />
      </span>
      <span className="mx-1.5">
        <Image
          width={16}
          height={16}
          src="/themes/Yaru/status/battery-good-symbolic.svg"
          alt="ubuntu battry"
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
