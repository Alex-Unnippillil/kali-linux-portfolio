import React from 'react';
import StatsChart from '../../StatsChart';
import type { WifiBand, WifiNetwork } from '../../../types/wifi';

export interface WifiChannelSummary {
  channel: number;
  band: WifiBand;
  signalDbm: number;
  noiseDbm: number;
  normalizedSignal: number;
  normalizedNoise: number;
  utilization: number; // 0..1
  networks: WifiNetwork[];
}

interface ChannelChartProps {
  summary: WifiChannelSummary;
}

const describeUtilisation = (utilisation: number) => {
  if (utilisation >= 0.75) return 'heavy';
  if (utilisation >= 0.45) return 'moderate';
  return 'light';
};

const ChannelChart: React.FC<ChannelChartProps> = ({ summary }) => {
  const { channel, band, signalDbm, noiseDbm, normalizedSignal, normalizedNoise, networks, utilization } = summary;
  const captionId = `wifi-channel-${channel}`;
  const utilizationPercent = Math.round(utilization * 100);
  const networkNames = networks.map((network) => network.ssid).join(', ');

  return (
    <figure
      className="rounded-md border border-ubt-cool-grey/60 bg-black/40 p-3 shadow-inner"
      aria-labelledby={captionId}
    >
      <div aria-hidden="true">
        <StatsChart count={normalizedSignal} time={normalizedNoise} />
      </div>
      <figcaption id={captionId} className="mt-2 text-sm text-ubt-grey">
        <span className="font-semibold text-white">Channel {channel}</span> on the {band} band averages
        {` ${signalDbm.toFixed(0)} dBm`} signal with a noise floor near {noiseDbm.toFixed(0)} dBm.
      </figcaption>
      <p className="sr-only">
        Channel {channel} hosts {networks.length} network{networks.length === 1 ? '' : 's'} with {describeUtilisation(utilization)}
        utilisation at approximately {utilizationPercent}% airtime.
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-ubt-grey">
        <div>
          <dt className="uppercase tracking-wide text-[0.65rem]">Signal</dt>
          <dd className="text-white">{signalDbm.toFixed(1)} dBm</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide text-[0.65rem]">Noise</dt>
          <dd className="text-white">{noiseDbm.toFixed(1)} dBm</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide text-[0.65rem]">Utilisation</dt>
          <dd className="text-white">{utilizationPercent}% airtime</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide text-[0.65rem]">Networks</dt>
          <dd className="text-white">{networkNames || '—'}</dd>
        </div>
      </dl>
    </figure>
  );
};

export default ChannelChart;
