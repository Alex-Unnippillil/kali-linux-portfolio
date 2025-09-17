"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import usePersistentState from "../../hooks/usePersistentState";

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
}) {
  // --- Controls -----------------------------------------------------------
  const [keymap, setKeymap] = usePersistentState("game-keymap", {
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    action: "Space",
    pause: "Escape",
  });
  const [waitingFor, setWaitingFor] = useState(null);

  const assignKey = useCallback(
    (e) => {
      if (!waitingFor) return;
      e.preventDefault();
      setKeymap({ ...keymap, [waitingFor]: e.key });
      setWaitingFor(null);
    },
    [waitingFor, keymap, setKeymap]
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
    const connect = () => setGamepadConnected(true);
    const disconnect = () => setGamepadConnected(false);
    window.addEventListener("gamepadconnected", connect);
    window.addEventListener("gamepaddisconnected", disconnect);
    return () => {
      window.removeEventListener("gamepadconnected", connect);
      window.removeEventListener("gamepaddisconnected", disconnect);
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
      const data = window.localStorage.getItem("game-snapshot");
      if (data) loadSnapshot(JSON.parse(data));
    }
  };

  const [highScore, setHighScore] = usePersistentState("game-highscore", 0);
  useEffect(() => {
    if (typeof currentScore === "number" && currentScore > highScore) {
      setHighScore(currentScore);
    }
  }, [currentScore, highScore, setHighScore]);

  const [achievements, setAchievements] = usePersistentState(
    "game-achievements",
    []
  );
  const unlockAchievement = (name) => {
    setAchievements((a) => (a.includes(name) ? a : [...a, name]));
  };

  // --- Display -----------------------------------------------------------
  const [palette, setPalette] = usePersistentState("game-palette", "default");
  const [highContrast, setHighContrast] = usePersistentState(
    "game-high-contrast",
    false
  );
  const [screenShake, setScreenShake] = usePersistentState(
    "game-screen-shake",
    true
  );

  // --- Input Latency Tester ---------------------------------------------
  const [latency, setLatency] = useState(null);
  const latencyHandlerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (latencyHandlerRef.current) {
        window.removeEventListener("keydown", latencyHandlerRef.current);
        latencyHandlerRef.current = null;
      }
    };
  }, []);

  const startLatencyTest = () => {
    const start = performance.now();
    if (latencyHandlerRef.current) {
      window.removeEventListener("keydown", latencyHandlerRef.current);
      latencyHandlerRef.current = null;
    }
    const handler = () => {
      setLatency(performance.now() - start);
      window.removeEventListener("keydown", handler);
      latencyHandlerRef.current = null;
    };
    window.addEventListener("keydown", handler);
    latencyHandlerRef.current = handler;
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
          />
          High Contrast
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={screenShake}
            onChange={(e) => setScreenShake(e.target.checked)}
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

