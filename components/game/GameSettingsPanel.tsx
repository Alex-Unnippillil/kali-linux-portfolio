"use client";

import React, { useState, useEffect, useCallback } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

type KeyAction = 'up' | 'down' | 'left' | 'right' | 'action' | 'pause';
type Keymap = Record<KeyAction, string>;

interface Props {
  onApplyKeymap?: (map: Keymap) => void;
  getSnapshot?: () => unknown;
  loadSnapshot?: (data: unknown) => void;
  currentScore?: number;
}

/**
 * Generic game settings panel providing common functionality for browser games.
 * Handles key remapping, speed control, audio mute, snapshot persistence,
 * high score tracking, achievements, color palettes, screen shake and an input
 * latency tester. All state is persisted to localStorage so settings survive
 * page reloads.
 */
export default function GameSettingsPanel({
  onApplyKeymap,
  getSnapshot,
  loadSnapshot,
  currentScore,
}: Props) {
  // --- Controls -----------------------------------------------------------
  const [keymap, setKeymap] = usePersistentState<Keymap>('game-keymap', {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    action: 'Space',
    pause: 'Escape',
  });
  const [waitingFor, setWaitingFor] = useState<KeyAction | null>(null);

  const assignKey = useCallback(
    (e: KeyboardEvent) => {
      if (!waitingFor) return;
      e.preventDefault();
      setKeymap({ ...keymap, [waitingFor]: e.key });
      setWaitingFor(null);
    },
    [waitingFor, keymap, setKeymap],
  );

  useEffect(() => {
    if (waitingFor) {
      window.addEventListener("keydown", assignKey, { once: true });
      return () => window.removeEventListener("keydown", assignKey);
    }
  }, [waitingFor, assignKey]);

  useEffect(() => {
    onApplyKeymap && onApplyKeymap(keymap);
  }, [keymap, onApplyKeymap]);

  const [gamepadConnected, setGamepadConnected] = useState(false);
  useEffect(() => {
    const connect = (_e: GamepadEvent) => setGamepadConnected(true);
    const disconnect = (_e: GamepadEvent) => setGamepadConnected(false);
    window.addEventListener('gamepadconnected', connect);
    window.addEventListener('gamepaddisconnected', disconnect);
    return () => {
      window.removeEventListener('gamepadconnected', connect);
      window.removeEventListener('gamepaddisconnected', disconnect);
    };
  }, []);

  // --- Gameplay ----------------------------------------------------------
  const [speed, setSpeed] = usePersistentState("game-speed", 1);
  const [muted, setMuted] = usePersistentState("game-muted", false);
  const toggleMute = () => setMuted((m) => !m);

  // --- Persistence -------------------------------------------------------
  const saveSnapshot = () => {
    if (getSnapshot) {
      const snap = getSnapshot();
      try {
        window.localStorage.setItem("game-snapshot", JSON.stringify(snap));
      } catch {}
    }
  };

  const loadSnapshotClick = () => {
    if (loadSnapshot) {
      const data = window.localStorage.getItem('game-snapshot');
      if (data) loadSnapshot(JSON.parse(data));
    }
  };

  const [highScore, setHighScore] = usePersistentState<number>('game-highscore', 0);
  useEffect(() => {
    if (typeof currentScore === "number" && currentScore > highScore) {
      setHighScore(currentScore);
    }
  }, [currentScore, highScore, setHighScore]);

  const [achievements, setAchievements] = usePersistentState<string[]>(
    'game-achievements',
    [],
  );
  const unlockAchievement = (name: string) => {
    setAchievements((a) => (a.includes(name) ? a : [...a, name]));
  };

  // --- Display -----------------------------------------------------------
  const [palette, setPalette] = usePersistentState<string>('game-palette', 'default');
  const [highContrast, setHighContrast] = usePersistentState<boolean>(
    'game-high-contrast',
    false,
  );
  const [screenShake, setScreenShake] = usePersistentState<boolean>(
    'game-screen-shake',
    true,
  );

  // --- Input Latency Tester ---------------------------------------------
  const [latency, setLatency] = useState<number | null>(null);
  const startLatencyTest = () => {
    const start = performance.now();
    const handler = () => {
      setLatency(performance.now() - start);
      window.removeEventListener("keydown", handler);
    };
    window.addEventListener("keydown", handler);
  };

  return (
    <div className="game-settings-panel">
      <section>
        <h3>Controls</h3>
        {Object.entries(keymap).map(([action, key]) => (
          <div key={action} className="flex gap-2 items-center">
            <span className="w-20 capitalize">{action}</span>
            <button onClick={() => setWaitingFor(action)}>
              {waitingFor === action ? "Press key" : key}
            </button>
          </div>
        ))}
        <p className="text-sm mt-2">
          {gamepadConnected ? "Gamepad connected" : "No gamepad"}
        </p>
      </section>

      <section>
        <h3>Gameplay</h3>
        <label className="block">
          Speed:
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.5"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              aria-label="Speed"
            />
          <span className="ml-2">{speed.toFixed(1)}x</span>
        </label>
        <button onClick={toggleMute} className="mt-2">
          {muted ? "Unmute" : "Mute"}
        </button>
      </section>

      <section>
        <h3>Progress</h3>
        <div className="flex gap-2">
          <button onClick={saveSnapshot}>Save Snapshot</button>
          <button onClick={loadSnapshotClick}>Load Snapshot</button>
        </div>
        <div className="mt-2">High Score: {highScore}</div>
        <div className="mt-1 text-sm">
          Achievements: {achievements.join(", ") || "None"}
        </div>
      </section>

      <section>
        <h3>Display</h3>
        <label className="block mb-2">
          Palette:
          <select
            value={palette}
            onChange={(e) => setPalette(e.target.value)}
            className="ml-2"
          >
            <option value="default">Default</option>
            <option value="protanopia">Protanopia</option>
            <option value="deuteranopia">Deuteranopia</option>
            <option value="tritanopia">Tritanopia</option>
          </select>
        </label>
        <label className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
              aria-label="High Contrast"
            />
          High Contrast
        </label>
        <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={screenShake}
              onChange={(e) => setScreenShake(e.target.checked)}
              aria-label="Screen Shake"
            />
          Screen Shake
        </label>
      </section>

      <section>
        <h3>Input Latency</h3>
        <button onClick={startLatencyTest}>Start Test</button>
        {latency !== null && <div>{latency.toFixed(0)} ms</div>}
      </section>
    </div>
  );
}

