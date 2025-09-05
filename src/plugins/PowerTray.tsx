import { useEffect, useState } from 'react';
import { getBatteryStatus, BatteryStatus } from '../lib/power/status';
import powerConfig from '../../power.json';

export default function PowerTray() {
  const [battery, setBattery] = useState<BatteryStatus>({ level: 1, charging: false });
  const [brightness, setBrightness] = useState<number>(powerConfig.brightness);

  useEffect(() => {
    getBatteryStatus().then(setBattery);
  }, []);

  const handleBrightness = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBrightness(parseInt(e.target.value, 10));
  };

  return (
    <div className="power-tray">
      <div className="battery-info">
        Battery: {(battery.level * 100).toFixed(0)}% {battery.charging ? '⚡' : ''}
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={brightness}
        onChange={handleBrightness}
      />
    </div>
  );
}
