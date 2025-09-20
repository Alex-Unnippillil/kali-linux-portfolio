import React, { useEffect, useMemo, useState } from 'react';
import type { ReducedMotionState } from '../../hooks/useReducedMotion';
import { useMotion } from '../ui/MotionProvider';

type AnimationSummary = {
  id: string;
  target: string;
  playState: string;
  duration: string;
  currentTime: string;
  preset?: string;
};

interface FrameStats {
  fps: number;
  frameMs: number;
  sampleSize: number;
}

interface MotionOverlayProps {
  reducedMotionState: ReducedMotionState;
}

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '1.5rem',
  right: '1.5rem',
  width: '340px',
  maxWidth: 'calc(100vw - 2rem)',
  padding: '1rem',
  background: 'rgba(15, 23, 42, 0.85)',
  color: '#e2e8f0',
  borderRadius: '0.75rem',
  fontSize: '0.85rem',
  lineHeight: 1.4,
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
  pointerEvents: 'none',
  zIndex: 9999,
  backdropFilter: 'blur(16px)',
};

const headerStyle: React.CSSProperties = {
  fontWeight: 600,
  marginBottom: '0.5rem',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  fontSize: '0.75rem',
  color: '#93c5fd',
};

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const itemStyle: React.CSSProperties = {
  marginBottom: '0.5rem',
  borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
  paddingBottom: '0.5rem',
};

const statLabelStyle: React.CSSProperties = {
  color: '#94a3b8',
  marginRight: '0.25rem',
};

const monoStyle: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
};

const MotionOverlay: React.FC<MotionOverlayProps> = ({ reducedMotionState }) => {
  const motion = useMotion();
  const [frameStats, setFrameStats] = useState<FrameStats>({ fps: 0, frameMs: 0, sampleSize: 0 });
  const [animations, setAnimations] = useState<{ active: number; summaries: AnimationSummary[] }>({
    active: 0,
    summaries: [],
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      return undefined;
    }
    let rafId = 0;
    let last = performance.now();
    let lastUpdate = last;
    const samples: number[] = [];
    const step = (timestamp: number) => {
      const delta = timestamp - last;
      last = timestamp;
      if (delta > 0 && delta < 1000) {
        samples.push(delta);
        if (samples.length > 120) samples.shift();
      }
      if (timestamp - lastUpdate > 200 && samples.length) {
        const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
        setFrameStats({
          fps: Number((1000 / average).toFixed(1)),
          frameMs: Number(average.toFixed(1)),
          sampleSize: samples.length,
        });
        lastUpdate = timestamp;
      }
      rafId = window.requestAnimationFrame(step);
    };
    rafId = window.requestAnimationFrame(step);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof document.getAnimations !== 'function') {
      return undefined;
    }

    const readAnimations = () => {
      const active = document
        .getAnimations()
        .filter((animation) => animation.playState === 'running');

      const summaries = active.slice(0, 6).map((animation, index) => {
        const effect = animation.effect as AnimationEffect | null;
        const keyframeEffect =
          effect && typeof KeyframeEffect !== 'undefined' && effect instanceof KeyframeEffect
            ? effect
            : null;
        const target = keyframeEffect?.target ?? null;
        const label = target?.getAttribute?.('data-debug-label')
          || target?.getAttribute?.('aria-label')
          || target?.id
          || (target?.className ? target.className.toString().split(' ').slice(0, 2).join('.') : '')
          || target?.tagName?.toLowerCase()
          || 'unknown';
        const preset = target?.getAttribute?.('data-motion-preset') ?? undefined;
        const timing =
          keyframeEffect && typeof keyframeEffect.getTiming === 'function'
            ? keyframeEffect.getTiming()
            : undefined;
        const durationValue = typeof timing?.duration === 'number' ? `${Math.round(timing.duration)}ms` : 'auto';
        const currentTime =
          typeof animation.currentTime === 'number' ? `${Math.round(animation.currentTime)}ms` : 'n/a';

        return {
          id: animation.id || `${label}-${index}`,
          target: label,
          playState: animation.playState,
          duration: durationValue,
          currentTime,
          preset,
        } satisfies AnimationSummary;
      });

      setAnimations({ active: active.length, summaries });
    };

    readAnimations();
    const interval = window.setInterval(readAnimations, 500);
    return () => window.clearInterval(interval);
  }, []);

  const presets = useMemo(
    () =>
      Object.values(motion.presets).map((preset) => ({
        name: preset.name,
        duration: preset.duration,
        easing: preset.easingToken,
        transition: preset.transition,
      })),
    [motion.presets],
  );

  return (
    <aside style={containerStyle} aria-hidden>
      <div style={headerStyle}>Motion Debug</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 0.5rem', marginBottom: '0.75rem' }}>
        <span style={statLabelStyle}>Reduced motion</span>
        <span style={monoStyle}>
          {reducedMotionState.reducedMotion ? 'enabled' : 'disabled'}
          {reducedMotionState.reason !== 'none' ? ` (${reducedMotionState.reason})` : ''}
        </span>
        <span style={statLabelStyle}>Frame time</span>
        <span style={monoStyle}>{frameStats.frameMs ? `${frameStats.frameMs}ms (~${frameStats.fps}fps)` : 'sampling…'}</span>
        <span style={statLabelStyle}>Active animations</span>
        <span style={monoStyle}>{animations.active}</span>
      </div>
      {animations.summaries.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ ...statLabelStyle, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
            Running animations
          </div>
          <ul style={listStyle}>
            {animations.summaries.map((summary) => (
              <li key={summary.id} style={itemStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={monoStyle}>{summary.target}</span>
                  <span style={statLabelStyle}>{summary.playState}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                  <span style={statLabelStyle}>Duration</span>
                  <span style={monoStyle}>{summary.duration}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={statLabelStyle}>Current</span>
                  <span style={monoStyle}>{summary.currentTime}</span>
                </div>
                {summary.preset ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={statLabelStyle}>Preset</span>
                    <span style={monoStyle}>{summary.preset}</span>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <div style={{ ...statLabelStyle, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
          Presets
        </div>
        <ul style={listStyle}>
          {presets.map((preset) => (
            <li key={preset.name} style={{ ...itemStyle, marginBottom: '0.25rem', paddingBottom: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={monoStyle}>{preset.name}</span>
                <span style={monoStyle}>{preset.duration}ms</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.125rem' }}>
                <span style={statLabelStyle}>Easing</span>
                <span style={monoStyle}>{preset.easing}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default MotionOverlay;
