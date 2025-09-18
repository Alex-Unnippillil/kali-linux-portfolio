'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  useDesignToken,
  useHoldInteraction,
  usePressInteraction,
  usePulseInteraction,
  useReducedMotion,
  useShakeInteraction,
  useShimmerInteraction,
  useSnapInteraction,
} from '../../components/ui/micro-interactions';

interface InteractionConfig {
  amplitude: number;
  duration: number;
}

type InteractionId = 'press' | 'hold' | 'shimmer' | 'shake' | 'pulse' | 'snap';

const defaultConfigs: Record<InteractionId, InteractionConfig> = {
  press: { amplitude: 0.08, duration: 150 },
  hold: { amplitude: 0.25, duration: 360 },
  shimmer: { amplitude: 0.35, duration: 1400 },
  shake: { amplitude: 0.55, duration: 380 },
  pulse: { amplitude: 0.32, duration: 420 },
  snap: { amplitude: 0.42, duration: 240 },
};

interface InteractionSectionProps {
  id: InteractionId;
  title: string;
  description: string;
  config: InteractionConfig;
  onAmplitudeChange: (value: number) => void;
  onDurationChange: (value: number) => void;
  children: ReactNode;
}

const InteractionSection = ({
  id,
  title,
  description,
  config,
  onAmplitudeChange,
  onDurationChange,
  children,
}: InteractionSectionProps) => (
  <section
    aria-labelledby={`${id}-heading`}
    className="rounded-xl border border-white/10 bg-black/30 p-4 shadow-lg backdrop-blur"
  >
    <header className="space-y-1">
      <h2 id={`${id}-heading`} className="text-lg font-semibold text-white">
        {title}
      </h2>
      <p className="text-sm text-ubt-grey/80">{description}</p>
    </header>
    <div className="mt-4 flex flex-col gap-4 lg:flex-row">
      <div className="flex flex-1 items-center justify-center rounded-lg bg-white/5 p-4" data-testid={`${id}-preview`}>
        {children}
      </div>
      <div className="w-full max-w-xs space-y-4 rounded-lg bg-white/5 p-4" aria-label={`${title} configuration`}>
        <Knob
          id={`${id}-amplitude`}
          label="Amplitude"
          min={0}
          max={1}
          step={0.01}
          value={config.amplitude}
          onChange={onAmplitudeChange}
          formatter={(value) => value.toFixed(2)}
        />
        <Knob
          id={`${id}-duration`}
          label="Duration"
          min={0}
          max={2000}
          step={10}
          value={config.duration}
          onChange={onDurationChange}
          suffix="ms"
        />
      </div>
    </div>
  </section>
);

interface KnobProps {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  formatter?: (value: number) => string;
}

const Knob = ({ id, label, min, max, step, value, onChange, suffix = '', formatter }: KnobProps) => {
  const display = formatter ? formatter(value) : value.toString();
  const sliderId = `${id}-slider`;
  const numberId = `${id}-number`;
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;
  return (
    <div className="flex flex-col gap-2 text-sm text-ubt-grey/80">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-ubt-grey/60">
        <label id={labelId} htmlFor={sliderId} className="cursor-pointer">
          {label}
        </label>
        <span id={valueId} className="font-semibold text-ubt-grey">
          {display}
          {suffix}
        </span>
      </div>
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-labelledby={labelId}
        aria-describedby={valueId}
        className="h-2 w-full rounded-full bg-white/20"
      />
      <label htmlFor={numberId} className="sr-only">
        {`${label} value`}
      </label>
      <input
        id={numberId}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-labelledby={`${labelId} ${valueId}`}
        className="rounded border border-white/10 bg-black/40 px-2 py-1 text-right text-sm text-white"
      />
    </div>
  );
};

const TokenBadge = ({ name, value }: { name: string; value: string }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ubt-grey/80">
    <span className="font-mono text-white">{name}</span>
    <span>{value}</span>
  </span>
);

const PressPreview = ({ config }: { config: InteractionConfig }) => {
  const press = usePressInteraction({
    amplitude: config.amplitude,
    duration: config.duration,
  });
  const pressProps = press.getPressProps<HTMLButtonElement>({
    className:
      'rounded-lg bg-ub-orange px-6 py-3 font-semibold text-black shadow focus:outline-none focus:ring-2 focus:ring-ub-orange focus:ring-offset-2 focus:ring-offset-black',
  });
  return (
    <button type="button" {...pressProps}>
      Press to confirm
    </button>
  );
};

const HoldPreview = ({ config }: { config: InteractionConfig }) => {
  const hold = useHoldInteraction({
    amplitude: config.amplitude,
    duration: config.duration,
  });
  const holdProps = hold.getHoldProps<HTMLButtonElement>({
    className:
      'rounded-lg bg-ubt-blue px-6 py-3 font-semibold text-black shadow focus:outline-none focus:ring-2 focus:ring-ubt-blue focus:ring-offset-2 focus:ring-offset-black',
  });
  const progressPercent = Math.round(hold.progress * 100);
  return (
    <div className="flex w-full flex-col gap-3">
      <button type="button" {...holdProps}>
        Hold to unlock
      </button>
      <div className="h-2 w-full rounded-full bg-white/10" aria-hidden="true">
        <div
          className="h-full rounded-full bg-ubt-blue transition-[width] duration-75 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <span className="text-xs text-ubt-grey/70">Progress: {progressPercent}%</span>
    </div>
  );
};

const ShimmerPreview = ({ config }: { config: InteractionConfig }) => {
  const shimmer = useShimmerInteraction({
    amplitude: config.amplitude,
    duration: config.duration,
    baseColor: 'rgba(15, 19, 23, 0.92)',
  });
  const shimmerProps = shimmer.getShimmerProps<HTMLDivElement>({
    className:
      'relative w-full overflow-hidden rounded-md border border-white/10 bg-ub-grey/40 text-left text-sm text-white shadow-inner',
  });
  return (
    <div data-testid="shimmer-preview" {...shimmerProps}>
      <div className="space-y-2 p-4">
        <p className="text-xs uppercase tracking-widest text-ubt-grey/70">Micro animation</p>
        <p className="text-lg font-semibold">Shimmer loading card</p>
        <p className="text-sm text-ubt-grey/80">
          Driven by live design tokens with configurable highlight strength.
        </p>
      </div>
    </div>
  );
};

const ShakePreview = ({ config }: { config: InteractionConfig }) => {
  const shake = useShakeInteraction({
    amplitude: config.amplitude,
    duration: config.duration,
  });
  const shakeProps = shake.getShakeProps<HTMLButtonElement>({
    className:
      'rounded-lg bg-red-500 px-6 py-3 font-semibold text-white shadow focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 focus:ring-offset-black',
    onClick: () => shake.trigger(),
  });
  return (
    <button type="button" {...shakeProps}>
      Shake to alert
    </button>
  );
};

const PulsePreview = ({ config }: { config: InteractionConfig }) => {
  const pulse = usePulseInteraction({
    amplitude: config.amplitude,
    duration: config.duration,
  });
  const pulseProps = pulse.getPulseProps<HTMLButtonElement>({
    className:
      'rounded-full bg-ubt-green px-6 py-3 font-semibold text-black shadow focus:outline-none focus:ring-2 focus:ring-ubt-green focus:ring-offset-2 focus:ring-offset-black',
    onClick: () => pulse.trigger(),
  });
  return (
    <button type="button" {...pulseProps}>
      Pulse beacon
    </button>
  );
};

const SnapPreview = ({ config }: { config: InteractionConfig }) => {
  const snap = useSnapInteraction({
    amplitude: config.amplitude,
    duration: config.duration,
  });
  const snapProps = snap.getSnapProps<HTMLButtonElement>({
    className:
      'rounded-lg bg-white/80 px-6 py-3 font-semibold text-black shadow focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black',
    onClick: () => snap.trigger(),
  });
  return (
    <button type="button" {...snapProps}>
      Snap into place
    </button>
  );
};

const DesignPortalApp = () => {
  const [configs, setConfigs] = useState(defaultConfigs);

  const updateConfig = (id: InteractionId, patch: Partial<InteractionConfig>) => {
    setConfigs((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const clampAmplitude = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(value, 0), 1);
  };

  const clampDuration = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(value, 0);
  };

  const motionFast = useDesignToken('--motion-fast', '150ms');
  const motionMedium = useDesignToken('--motion-medium', '300ms');
  const motionSlow = useDesignToken('--motion-slow', '500ms');
  const prefersReduced = useReducedMotion();

  const tokenBadges = useMemo(
    () => [
      { name: '--motion-fast', value: motionFast },
      { name: '--motion-medium', value: motionMedium },
      { name: '--motion-slow', value: motionSlow },
    ],
    [motionFast, motionMedium, motionSlow],
  );

  return (
    <div className="h-full w-full overflow-y-auto bg-ub-cool-grey p-6 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold">Design portal · Micro-interactions</h1>
            <p className="mt-2 max-w-3xl text-sm text-ubt-grey/80">
              Explore reusable interaction hooks that map to the Kali desktop design tokens. Adjust amplitude
              and duration to preview press, hold, shimmer, shake, pulse, and snap behaviors while validating
              accessibility constraints.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2" aria-label="Motion tokens">
            {tokenBadges.map((token) => (
              <TokenBadge key={token.name} name={token.name} value={token.value} />
            ))}
            <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-ubt-grey/70">
              <span className="font-semibold uppercase tracking-widest">Reduced motion</span>
              <span className="font-mono text-white">{prefersReduced ? 'enabled' : 'off'}</span>
            </span>
          </div>
        </header>
        <div className="grid gap-6 xl:grid-cols-2">
          <InteractionSection
            id="press"
            title="Press"
            description="Scale and depth feedback triggered on pointer or keyboard press."
            config={configs.press}
            onAmplitudeChange={(value) => updateConfig('press', { amplitude: clampAmplitude(value) })}
            onDurationChange={(value) => updateConfig('press', { duration: clampDuration(value) })}
          >
            <PressPreview config={configs.press} />
          </InteractionSection>
          <InteractionSection
            id="hold"
            title="Hold"
            description="Long-press affordance with progress feedback before commit."
            config={configs.hold}
            onAmplitudeChange={(value) => updateConfig('hold', { amplitude: clampAmplitude(value) })}
            onDurationChange={(value) => updateConfig('hold', { duration: clampDuration(value) })}
          >
            <HoldPreview config={configs.hold} />
          </InteractionSection>
          <InteractionSection
            id="shimmer"
            title="Shimmer"
            description="Ambient loading shimmer that respects system motion preferences."
            config={configs.shimmer}
            onAmplitudeChange={(value) => updateConfig('shimmer', { amplitude: clampAmplitude(value) })}
            onDurationChange={(value) => updateConfig('shimmer', { duration: clampDuration(value) })}
          >
            <ShimmerPreview config={configs.shimmer} />
          </InteractionSection>
          <InteractionSection
            id="shake"
            title="Shake"
            description="Directional nudge for validation and attention cues."
            config={configs.shake}
            onAmplitudeChange={(value) => updateConfig('shake', { amplitude: clampAmplitude(value) })}
            onDurationChange={(value) => updateConfig('shake', { duration: clampDuration(value) })}
          >
            <ShakePreview config={configs.shake} />
          </InteractionSection>
          <InteractionSection
            id="pulse"
            title="Pulse"
            description="One-shot pulse animation for status and beacon elements."
            config={configs.pulse}
            onAmplitudeChange={(value) => updateConfig('pulse', { amplitude: clampAmplitude(value) })}
            onDurationChange={(value) => updateConfig('pulse', { duration: clampDuration(value) })}
          >
            <PulsePreview config={configs.pulse} />
          </InteractionSection>
          <InteractionSection
            id="snap"
            title="Snap"
            description="Snaps content into place with a subtle overshoot easing curve."
            config={configs.snap}
            onAmplitudeChange={(value) => updateConfig('snap', { amplitude: clampAmplitude(value) })}
            onDurationChange={(value) => updateConfig('snap', { duration: clampDuration(value) })}
          >
            <SnapPreview config={configs.snap} />
          </InteractionSection>
        </div>
      </div>
    </div>
  );
};

export default DesignPortalApp;
