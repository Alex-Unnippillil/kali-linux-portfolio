"use client";

import { useEffect, useRef, useCallback, useState } from 'react';
import usePersistedState from './usePersistedState';

/**
 * Global game audio hook.  Lazily creates an `AudioContext` in response to the
 * first user interaction to satisfy browser autoplay policies.  All playback
 * is routed through a `GainNode` and `DynamicsCompressorNode` so callers can
 * control overall volume and muting.
 *
 * The hook exposes helpers for simple sound effect playback as well as
 * state‑based music layer crossfades.  All methods are no‑ops if Web Audio is
 * unavailable.
 */
export default function useGameAudio() {
  const ctxRef = useRef(null);
  const masterGainRef = useRef(null);
  const compressorRef = useRef(null);
  const sfxBuffersRef = useRef({});
  const musicLayersRef = useRef({});

  // Global mute is persisted across the portfolio, but per‑game volume lives
  // only for the lifetime of the hook instance.
  const [muted, setMuted] = usePersistedState('settings:audioMuted', false);
  const [gameVolume, setGameVolume] = useState(1);
  const [ready, setReady] = useState(false);

  // Create the audio graph after the first user interaction to comply with
  // autoplay policies.
  useEffect(() => {
    const initAudio = () => {
      if (ready || ctxRef.current) return;
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const gain = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
      gain.connect(compressor);
      compressor.connect(ctx.destination);
      gain.gain.value = muted ? 0 : gameVolume;
      ctxRef.current = ctx;
      masterGainRef.current = gain;
      compressorRef.current = compressor;
      setReady(true);
    };

    window.addEventListener('pointerdown', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', initAudio);
      window.removeEventListener('keydown', initAudio);
      if (ctxRef.current) {
        ctxRef.current.close();
        ctxRef.current = null;
        masterGainRef.current = null;
        compressorRef.current = null;
      }
    };
  }, [muted, gameVolume, ready]);

  // Whenever mute/volume changes update the master gain accordingly.
  useEffect(() => {
    if (masterGainRef.current)
      masterGainRef.current.gain.value = muted ? 0 : gameVolume;
  }, [muted, gameVolume]);

  // Helper to load an AudioBuffer by URL.
  const fetchBuffer = useCallback(async (url) => {
    const ctx = ctxRef.current;
    if (!ctx) return null;
    const res = await fetch(url);
    const arr = await res.arrayBuffer();
    return await ctx.decodeAudioData(arr);
  }, []);

  /**
   * Play a named sound effect.  If the buffer has not been fetched yet it will
   * be loaded from `/audio/<name>.mp3` on demand.  `pitchJitter` detunes the
   * playback in cents and `volume` scales the per‑effect loudness.
   */
  const playSfx = useCallback(
    async (name, { pitchJitter = 0, volume = 1 } = {}) => {
      const ctx = ctxRef.current;
      const gainDest = masterGainRef.current;
      if (!ctx || !gainDest || muted) return;

      let buffer = sfxBuffersRef.current[name];
      if (!buffer) {
        try {
          buffer = await fetchBuffer(`/audio/${name}.mp3`);
          if (!buffer) return;
          sfxBuffersRef.current[name] = buffer;
        } catch {
          return;
        }
      }

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      if (pitchJitter) {
        // Detune in cents; convert semitone jitter to cents
        const detune = (Math.random() * 2 - 1) * pitchJitter * 100;
        src.detune.value = detune;
      }

      const gain = ctx.createGain();
      gain.gain.value = volume;
      src.connect(gain);
      gain.connect(gainDest);
      src.start();
    },
    [fetchBuffer, muted],
  );

  /**
   * Register a looping music layer for a given state.  The layer is loaded and
   * started immediately with zero gain.  Call `setMusicState` to crossfade.
   */
  const addMusicLayer = useCallback(async (state, url) => {
    const ctx = ctxRef.current;
    const gainDest = masterGainRef.current;
    if (!ctx || !gainDest) return;

    try {
      const buffer = await fetchBuffer(url);
      if (!buffer) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain);
      gain.connect(gainDest);
      src.start();
      musicLayersRef.current[state] = { source: src, gain };
    } catch {
      /* ignore */
    }
  }, [fetchBuffer]);

  /**
   * Crossfade to the specified music state over one second by ramping the gains
   * of registered layers.
   */
  const setMusicState = useCallback((state) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    Object.entries(musicLayersRef.current).forEach(([name, layer]) => {
      const target = name === state && !muted ? gameVolume : 0;
      layer.gain.gain.cancelScheduledValues(ctx.currentTime);
      layer.gain.gain.linearRampToValueAtTime(target, ctx.currentTime + 1);
    });
  }, [muted, gameVolume]);

  /**
   * Play a short synthesized tone routed through the master gain node.
   * Useful for lightweight SFX when no audio assets exist.
   */
  const playTone = useCallback(
    (
      frequency,
      {
        duration = 0.08,
        type = 'sine',
        volume = 0.5,
        attack = 0.01,
        release = 0.05,
      } = {},
    ) => {
      const ctx = ctxRef.current;
      const gainDest = masterGainRef.current;
      if (!ctx || !gainDest || muted) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(gainDest);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);
      osc.start(now);
      osc.stop(now + duration + release + 0.02);
    },
    [muted],
  );

  return {
    context: ctxRef.current,
    muted,
    setMuted,
    volume: gameVolume,
    setVolume: setGameVolume,
    playSfx,
    playTone,
    addMusicLayer,
    setMusicState,
  };
}
