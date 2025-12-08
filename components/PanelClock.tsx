'use client';

import { useEffect, useMemo, useState } from 'react';

type PanelClockProps = {
  className?: string;
  locale?: Intl.LocalesArgument;
  options?: Intl.DateTimeFormatOptions;
  timeZone?: string;
};

const DEFAULT_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
};

export default function PanelClock({
  className,
  locale,
  options,
  timeZone,
}: PanelClockProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const intervalId = window.setInterval(tick, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const formatOptions = useMemo(() => {
    const merged: Intl.DateTimeFormatOptions = {
      ...DEFAULT_FORMAT_OPTIONS,
      ...options,
    };

    if (timeZone) {
      merged.timeZone = timeZone;
    }

    return merged;
  }, [options, timeZone]);

  const formatter = useMemo(
    () => new Intl.DateTimeFormat(locale, formatOptions),
    [locale, formatOptions]
  );

  return (
    <time dateTime={now.toISOString()} className={className}>
      {formatter.format(now)}
    </time>
  );
}
