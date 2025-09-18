import { useEffect, useState } from 'react';
import { getBatterySnapshot, type BatterySnapshot } from '../../../utils/powerManager';

const clampPercent = (value: number): number => Math.min(100, Math.max(0, Math.round(value)));

const HealthPanel = () => {
  const [snapshot, setSnapshot] = useState<BatterySnapshot>(() => getBatterySnapshot());

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const id = window.setInterval(() => {
      setSnapshot(getBatterySnapshot());
    }, 60000);
    return () => window.clearInterval(id);
  }, []);

  const { cycleCount, healthPercent, designCapacityWh, fullChargeCapacityWh, levelPercent } = snapshot;
  const cappedHealth = clampPercent(healthPercent);
  const wearPercent = clampPercent(100 - cappedHealth);
  const capacityDelta = Math.max(0, designCapacityWh - fullChargeCapacityWh);

  return (
    <section
      className="rounded-md bg-ub-dark-grey text-white p-4 space-y-4"
      aria-label="Battery health overview"
    >
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Battery health</h2>
        <p className="text-xs text-gray-300">
          Mock telemetry derived from the portfolio power manager.
        </p>
      </header>
      <dl className="space-y-4 text-sm">
        <div>
          <dt className="uppercase tracking-wide text-gray-300 text-xs">Cycle count</dt>
          <dd className="text-2xl font-bold" aria-live="polite">
            {cycleCount}
          </dd>
        </div>
        <div className="space-y-2">
          <dt className="uppercase tracking-wide text-gray-300 text-xs">Health remaining</dt>
          <dd className="flex items-center gap-3">
            <div
              className="flex-1 h-2 rounded bg-ub-cool-grey overflow-hidden"
              role="presentation"
              aria-hidden="true"
            >
              <div
                className="h-full bg-green-400"
                style={{ width: `${cappedHealth}%` }}
              />
            </div>
            <span className="text-base font-semibold" aria-live="polite">
              {cappedHealth}%
            </span>
          </dd>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <dt className="uppercase tracking-wide text-gray-300 text-xs">Design capacity</dt>
            <dd className="font-semibold">{designCapacityWh.toFixed(1)} Wh</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide text-gray-300 text-xs">Full charge</dt>
            <dd className="font-semibold">{fullChargeCapacityWh.toFixed(1)} Wh</dd>
          </div>
        </div>
        <div className="text-xs text-gray-300">
          <p>
            Estimated wear: <span className="font-semibold">{wearPercent}%</span>
          </p>
          <p>
            Capacity delta: <span className="font-semibold">{capacityDelta.toFixed(1)} Wh</span>
          </p>
          <p>
            Remaining charge: <span className="font-semibold">{levelPercent}%</span>
          </p>
        </div>
      </dl>
    </section>
  );
};

export default HealthPanel;
