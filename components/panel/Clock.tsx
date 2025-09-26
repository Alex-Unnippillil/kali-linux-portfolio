"use client";

import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const CalendarPopover = lazy(() => import("./CalendarPopover"));

const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatTime(date: Date) {
  return TIME_FORMATTER.format(date);
}

export default function Clock() {
  const [isClient, setIsClient] = useState(false);
  const [time, setTime] = useState<string>("");
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    let intervalId: number | undefined;
    let timeoutId: number | undefined;

    const updateTime = () => setTime(formatTime(new Date()));

    const scheduleNext = () => {
      const now = new Date();
      const msUntilNextMinute =
        (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
      timeoutId = window.setTimeout(() => {
        updateTime();
        intervalId = window.setInterval(updateTime, 60_000);
      }, msUntilNextMinute);
    };

    updateTime();
    scheduleNext();

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [isClient]);

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      buttonRef.current?.focus();
    }
  }, [open]);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const timeLabel = useMemo(() => time || formatTime(new Date()), [time]);

  if (!isClient) {
    return null;
  }

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="px-2 py-1 rounded text-sm font-medium text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ubt-blue focus-visible:ring-offset-ub-cool-grey"
      >
        {timeLabel}
      </button>
      {open ? (
        <div
          ref={popoverRef}
          className="absolute right-0 mt-2 w-72 origin-top-right"
          role="presentation"
        >
          <Suspense
            fallback={
              <div className="rounded bg-ub-cool-grey/90 p-4 text-sm text-white shadow-lg">
                Loading calendar...
              </div>
            }
          >
            <CalendarPopover onClose={() => setOpen(false)} />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
}
