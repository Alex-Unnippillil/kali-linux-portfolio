import React from "react";
import SmallArrow from "./small_arrow";
import { useSettings } from '../../hooks/useSettings';
import VolumeControl from '../ui/VolumeControl';
import NetworkIndicator from '../ui/NetworkIndicator';
import BatteryIndicator from '../ui/BatteryIndicator';
import useNetworkStatus from '../../hooks/useNetworkStatus';

export default function Status() {
  const { allowNetwork } = useSettings();
  const online = useNetworkStatus();

  return (
    <div className="flex justify-center items-center">
      <NetworkIndicator
        className="mx-1.5"
        allowNetwork={allowNetwork}
        online={online}
      />
      <VolumeControl className="mx-1.5" />
      <BatteryIndicator className="mx-1.5" />
      <span className="mx-1">
        <SmallArrow angle="down" className=" status-symbol" />
      </span>
    </div>
  );
}
