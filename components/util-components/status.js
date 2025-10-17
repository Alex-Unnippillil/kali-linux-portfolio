import React, { useEffect, useId, useState } from "react";
import SmallArrow from "./small_arrow";
import { useSettings } from '../../hooks/useSettings';
import VolumeControl from '../ui/VolumeControl';
import NetworkIndicator from '../ui/NetworkIndicator';
import BatteryIndicator from '../ui/BatteryIndicator';

export default function Status() {
  const { allowNetwork } = useSettings();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const pingServer = async () => {
      if (!window?.location) return;
      try {
        const url = new URL('/favicon.ico', window.location.href).toString();
        await fetch(url, { method: 'HEAD', cache: 'no-store' });
        setOnline(true);
      } catch (e) {
        setOnline(false);
      }
    };

    const updateStatus = () => {
      const isOnline = navigator.onLine;
      setOnline(isOnline);
      if (isOnline) {
        pingServer();
      }
    };

    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  const networkDescriptionId = useId();
  const volumeDescriptionId = useId();
  const batteryDescriptionId = useId();

  const networkTooltipId = `${networkDescriptionId}-tooltip`;
  const volumeTooltipId = `${volumeDescriptionId}-tooltip`;
  const batteryTooltipId = `${batteryDescriptionId}-tooltip`;

  return (
    <div className="grid grid-flow-col auto-cols-[var(--shell-hit-target)] items-center gap-1">
      <NetworkIndicator
        className="justify-center"
        allowNetwork={allowNetwork}
        online={online}
        descriptionId={networkDescriptionId}
        tooltipId={networkTooltipId}
      />
      <VolumeControl
        className="justify-center"
        descriptionId={volumeDescriptionId}
        tooltipId={volumeTooltipId}
      />
      <BatteryIndicator
        className="justify-center"
        descriptionId={batteryDescriptionId}
        tooltipId={batteryTooltipId}
      />
      <span
        className="inline-flex h-[var(--shell-hit-target)] w-[var(--shell-hit-target)] items-center justify-center"
        aria-hidden="true"
      >
        <SmallArrow angle="down" className="status-symbol" />
      </span>
    </div>
  );
}
