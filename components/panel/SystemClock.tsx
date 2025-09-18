"use client";

import { useEffect, useMemo, useState } from "react";

type SystemClockProps = {
  /**
   * Optional additional class names to append to the panel clock wrapper.
   */
  className?: string;
};

const FALLBACK_LOCALE = "en-GB";

type DateTimeFormatter = (date: Date, locale: string) => string;

const formatClock: DateTimeFormatter = (date, locale) => {
  const weekday = date.toLocaleDateString(locale, { weekday: "short" });
  const day = date.toLocaleDateString(locale, { day: "2-digit" });
  const month = date.toLocaleDateString(locale, { month: "short" });
  const time = date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  return `${weekday} ${day} ${month}, ${time}`;
};

const formatTooltip: DateTimeFormatter = (date, locale) =>
  date.toLocaleString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

const getPreferredLocale = (): string => {
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }

  return FALLBACK_LOCALE;
};

export default function SystemClock({ className }: SystemClockProps) {
  const [now, setNow] = useState(() => new Date());
  const [locale, setLocale] = useState(FALLBACK_LOCALE);

  useEffect(() => {
    setLocale(getPreferredLocale());

    const update = () => setNow(new Date());
    update();

    const intervalId = window.setInterval(update, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const displayValue = useMemo(() => formatClock(now, locale), [now, locale]);
  const tooltipValue = useMemo(() => formatTooltip(now, locale), [now, locale]);

  const baseClassName =
    "font-ubuntu text-sm text-ubt-grey tracking-wide leading-none select-none";
  const combinedClassName = className
    ? `${baseClassName} ${className}`
    : baseClassName;

  return (
    <time
      className={combinedClassName}
      dateTime={now.toISOString()}
      title={tooltipValue}
      suppressHydrationWarning
    >
      {displayValue}
    </time>
  );
}
