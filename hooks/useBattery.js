'use client';

import { useEffect, useRef, useState } from 'react';

export default function useBattery() {
  const [level, setLevel] = useState(null);
  const [charging, setCharging] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const historyRef = useRef([]);

  useEffect(() => {
    let battery;
    let interval;

    const update = () => {
      const now = Date.now();
      const lvl = battery.level;
      const chg = battery.charging;
      setLevel(lvl);
      setCharging(chg);

      const history = historyRef.current;
      history.push({ time: now, level: lvl });
      const cutoff = now - 60000;
      while (history.length && history[0].time < cutoff) history.shift();

      if (history.length >= 2) {
        const first = history[0];
        const last = history[history.length - 1];
        const dt = (last.time - first.time) / 1000;
        const dl = last.level - first.level;
        const rate = dl / dt;
        if (rate !== 0) {
          let est = chg ? (1 - last.level) / rate : last.level / -rate;
          if (est > 0 && isFinite(est)) {
            setTimeLeft(est);
            return;
          }
        }
      }
      setTimeLeft(null);
    };

    navigator.getBattery?.().then((b) => {
      battery = b;
      update();
      battery.addEventListener('levelchange', update);
      battery.addEventListener('chargingchange', update);
      interval = setInterval(update, 1000);
    }).catch(() => {});

    return () => {
      if (battery) {
        battery.removeEventListener('levelchange', update);
        battery.removeEventListener('chargingchange', update);
      }
      if (interval) clearInterval(interval);
    };
  }, []);

  return { level, charging, timeLeft };
}

