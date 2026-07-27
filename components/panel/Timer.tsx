'use client';

import { useState, useEffect } from 'react';

interface TimerItem {
  id: number;
  label: string;
  duration: number; // seconds
  remaining: number; // seconds
  running: boolean;
  mode: 'countdown' | 'alarm';
  command?: string;
  target?: Date; // for alarm
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}

let idCounter = 0;

export default function Timer() {
  const [timers, setTimers] = useState<TimerItem[]>([]);
  const [label, setLabel] = useState('');
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(30);
  const [mode, setMode] = useState<'countdown' | 'alarm'>('countdown');
  const [alarmTime, setAlarmTime] = useState('00:00');
  const [command, setCommand] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) =>
        prev.map((t) => {
          if (!t.running) return t;
          let remaining = t.remaining;
          if (t.mode === 'alarm' && t.target) {
            remaining = Math.max(
              0,
              Math.floor((t.target.getTime() - Date.now()) / 1000)
            );
          } else {
            remaining = Math.max(0, t.remaining - 1);
          }

          if (remaining === 0 && t.running) {
            if (t.command) console.log(`[mock] ${t.command}`);
            if (typeof window !== 'undefined') {
              // simple beep using Web Audio API
              try {
                const ctx = new (window.AudioContext ||
                  (window as any).webkitAudioContext)();
                const osc = ctx.createOscillator();
                osc.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.2);
              } catch {}
              window.alert(`${t.label || 'Timer'} finished`);
            }
          }

          return { ...t, remaining, running: remaining > 0 };
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const addTimer = () => {
    let duration = minutes * 60 + seconds;
    let remaining = duration;
    let target: Date | undefined;

    if (mode === 'alarm') {
      const [h, m] = alarmTime.split(':').map((n) => parseInt(n, 10));
      const now = new Date();
      target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1); // next day
      }
      remaining = Math.floor((target.getTime() - now.getTime()) / 1000);
      duration = remaining;
    }

    const newTimer: TimerItem = {
      id: ++idCounter,
      label,
      duration,
      remaining,
      running: false,
      mode,
      command: command || undefined,
      target,
    };
    setTimers((t) => [...t, newTimer]);
    setLabel('');
    setMinutes(0);
    setSeconds(30);
    setCommand('');
  };

  const start = (id: number) => {
    setTimers((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              running: true,
              target:
                t.mode === 'alarm'
                  ? t.target
                  : new Date(Date.now() + t.remaining * 1000),
            }
          : t
      )
    );
  };

  const stop = (id: number) => {
    setTimers((prev) => prev.map((t) => (t.id === id ? { ...t, running: false } : t)));
  };

  const reset = (id: number) => {
    setTimers((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              running: false,
              remaining: t.duration,
            }
          : t
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <input
          className="border p-1"
          placeholder="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <select
          className="border p-1"
          value={mode}
          onChange={(e) => setMode(e.target.value as 'countdown' | 'alarm')}
        >
          <option value="countdown">Countdown</option>
          <option value="alarm">Alarm</option>
        </select>
        {mode === 'countdown' ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="border p-1 w-16"
              min={0}
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value, 10) || 0)}
            />
            :
            <input
              type="number"
              className="border p-1 w-16"
              min={0}
              max={59}
              value={seconds}
              onChange={(e) => setSeconds(parseInt(e.target.value, 10) || 0)}
            />
          </div>
        ) : (
          <input
            type="time"
            className="border p-1 w-32"
            value={alarmTime}
            onChange={(e) => setAlarmTime(e.target.value)}
          />
        )}
        <input
          className="border p-1"
          placeholder="Mock command (optional)"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
        />
        <button type="button" className="bg-blue-500 text-white p-1" onClick={addTimer}>
          Add Timer
        </button>
      </div>

      {timers.map((t) => {
        const progress = 1 - t.remaining / t.duration;
        return (
          <div key={t.id} className="border p-2 rounded">
            <div className="flex justify-between items-center">
              <span>{t.label || `Timer ${t.id}`}</span>
              <span>{formatTime(t.remaining)}</span>
            </div>
            <div className="w-full bg-gray-200 h-2 my-2">
              <div
                className="bg-green-500 h-2"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="bg-green-500 text-white px-2 py-1"
                onClick={() => start(t.id)}
                disabled={t.running}
              >
                Start
              </button>
              <button
                type="button"
                className="bg-yellow-500 text-white px-2 py-1"
                onClick={() => stop(t.id)}
                disabled={!t.running}
              >
                Stop
              </button>
              <button
                type="button"
                className="bg-red-500 text-white px-2 py-1"
                onClick={() => reset(t.id)}
              >
                Reset
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
