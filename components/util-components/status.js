import React from "react";
import SmallArrow from "./small_arrow";
import { useSettings } from '../../hooks/useSettings';
import VolumeControl from '../ui/VolumeControl';
import NetworkIndicator from '../ui/NetworkIndicator';
import BatteryIndicator from '../ui/BatteryIndicator';

const FALLBACK_STATUS = {
  online: true,
  isOnlineSimulated: true,
  batteryLevel: 0.75,
  batteryCharging: true,
  isBatterySimulated: true,
};

export default function Status({
  status = FALLBACK_STATUS,
  announcement = '',
  announcementId = 0,
  onBatteryLevelChange,
  onBatteryChargingChange,
}) {
  const { allowNetwork } = useSettings();
  const resolvedStatus = {
    ...FALLBACK_STATUS,
    ...status,
  };

  const networkHint = resolvedStatus.isOnlineSimulated
    ? 'Simulated network status'
    : 'Live network status';
  const batteryHint = resolvedStatus.isBatterySimulated
    ? 'Simulated battery level'
    : 'Live battery level';

  return (
    <div className="flex justify-center items-center">
      <NetworkIndicator
        className="mx-1.5"
        allowNetwork={allowNetwork}
        online={resolvedStatus.online}
        simulationHint={networkHint}
      />
      <VolumeControl className="mx-1.5" />
      <BatteryIndicator
        className="mx-1.5"
        level={resolvedStatus.batteryLevel}
        charging={resolvedStatus.batteryCharging}
        isSimulated={resolvedStatus.isBatterySimulated}
        simulationHint={batteryHint}
        onLevelChange={onBatteryLevelChange}
        onChargingChange={onBatteryChargingChange}
      />
      <span className="mx-1">
        <SmallArrow angle="down" className=" status-symbol" />
      </span>
      <span key={announcementId} className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </div>
  );
}
