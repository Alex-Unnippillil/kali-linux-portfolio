import { useState, useEffect } from 'react';
import { openDateTime } from '@/pages/apps/settings/date-time';

export default function Clock() {
  const [now, setNow] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-2 py-1 text-sm hover:bg-ubt-grey rounded"
        aria-label="Clock menu"
      >
        {timeStr}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 bg-ub-grey text-ubt-grey shadow-md border border-gray-900 z-50">
          <button
            type="button"
            className="block w-full text-left px-4 py-2 hover:bg-ub-cool-grey"
            onClick={() => {
              openDateTime();
              setOpen(false);
            }}
          >
            Time & Date Settings
          </button>
        </div>
      )}
    </div>
  );
}

