'use client';

import { useEffect, useState } from 'react';
import usePersistentState from '../../../../hooks/usePersistentState';
import { subscribe } from '../../../../utils/pubsub';

interface DateTimeSettings {
  timeZone: string;
  hour12: boolean;
  showSeconds: boolean;
  firstDayOfWeek: number;
}

const defaults: DateTimeSettings = {
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  hour12: Intl.DateTimeFormat().resolvedOptions().hour12 ?? true,
  showSeconds: false,
  firstDayOfWeek: 0,
};

export default function Clock() {
  const [settings, setSettings] = usePersistentState<DateTimeSettings>(
    'settings.datetime',
    { ...defaults },
  );
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const unsub = subscribe('settings.datetime', (data) => {
      setSettings(data as DateTimeSettings);
    });
    return unsub;
  }, [setSettings]);

  useEffect(() => {
    const interval = setInterval(
      () => setNow(new Date()),
      settings.showSeconds ? 1000 : 60000,
    );
    return () => clearInterval(interval);
  }, [settings.showSeconds]);

  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone: settings.timeZone,
    hour12: settings.hour12,
    hour: 'numeric',
    minute: 'numeric',
    ...(settings.showSeconds ? { second: 'numeric' } : {}),
  });

  return <span suppressHydrationWarning>{formatter.format(now)}</span>;
}

