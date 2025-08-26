import React, { useEffect, useState } from 'react';
import usePersistentState from '../usePersistentState';

const demoForecast = () => {
  const now = new Date();
  const day = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  return {
    current_weather: { temperature: 21 },
    daily: {
      time: [day(0), day(1), day(2)],
      temperature_2m_max: [24, 23, 22],
      temperature_2m_min: [16, 15, 14],
    },
  };
};

const demoAlerts = () => [
  {
    event: 'Thunderstorm',
    description: 'Chance of thunderstorms in the area.',
    severity: 'warning',
  },
];

const Weather = () => {
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [settings, setSettings] = usePersistentState(
    'weather_alert_settings',
    {}
  );

  useEffect(() => {
    const load = async () => {
      if (!navigator.geolocation) {
        setData(demoForecast());
        setAlerts(demoAlerts());
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const url =
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&current_weather=true&timezone=auto&alerts=true`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch forecast');
            const json = await res.json();
            setData(json);
            setAlerts(
              Array.isArray(json?.alerts?.warnings)
                ? json.alerts.warnings
                : Array.isArray(json?.alerts)
                ? json.alerts
                : []
            );
          } catch {
            setData(demoForecast());
            setAlerts(demoAlerts());
          }
        },
        () => {
          setData(demoForecast());
          setAlerts(demoAlerts());
        }
      );
    };
    load();
  }, []);

  if (!data) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white">
        Loading...
      </div>
    );
  }

  const formatDate = (str) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(str));

  const eventName = (a) => a.event || a.headline || a.title || 'Alert';
  const activeAlerts = alerts.filter((a) => settings[eventName(a)] !== false);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 overflow-auto">
      <div className="text-4xl mb-4">
        {Math.round(data.current_weather.temperature)}°C
      </div>
      {activeAlerts.length > 0 && (
        <div className="w-full max-w-xs mb-4">
          <h2 className="font-bold mb-1">Alerts</h2>
          <ul className="space-y-2 text-sm">
            {activeAlerts.map((a, i) => (
              <li key={i} className="bg-red-600 text-white p-2 rounded">
                <strong>{eventName(a)}</strong>
                {a.description && (
                  <div className="text-xs mt-1">{a.description}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <ul className="text-sm w-full max-w-xs space-y-1">
        {data.daily.time.map((t, i) => (
          <li key={t} className="flex justify-between">
            <span>{formatDate(t)}</span>
            <span>
              {Math.round(data.daily.temperature_2m_max[i])}/
              {Math.round(data.daily.temperature_2m_min[i])}°C
            </span>
          </li>
        ))}
      </ul>
      {alerts.length > 0 && (
        <div className="text-sm w-full max-w-xs mt-4">
          <h2 className="font-bold mb-1">Notification Settings</h2>
          {Array.from(new Set(alerts.map(eventName))).map((e) => (
            <label key={e} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings[e] !== false}
                onChange={() =>
                  setSettings((s) => ({ ...s, [e]: !(s[e] !== false) }))
                }
              />
              <span>{e}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default Weather;

export const displayWeather = () => {
  return <Weather />;
};

