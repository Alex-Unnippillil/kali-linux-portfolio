import React, { useEffect, useRef, useState } from 'react';

const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const Clock: React.FC = () => {
  const [now, setNow] = useState(new Date());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const formattedTime = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const tooltip = now.toLocaleString();

  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks: (number | null)[][] = [];
  let current = 1 - firstDay;
  while (current <= daysInMonth) {
    weeks.push(
      Array.from({ length: 7 }, (_, idx) => {
        const day = current + idx;
        return day > 0 && day <= daysInMonth ? day : null;
      })
    );
    current += 7;
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        className="px-2 py-1 text-white hover:bg-gray-700 rounded"
        onClick={() => setOpen((o) => !o)}
        title={tooltip}
      >
        {formattedTime}
      </button>
      {open && (
        <div className="absolute z-10 mt-2 p-2 bg-gray-800 text-white rounded shadow-lg">
          <div className="text-center font-semibold mb-2">
            {now.toLocaleString('default', { month: 'long' })} {year}
          </div>
          <table className="border-collapse">
            <thead>
              <tr>
                {daysOfWeek.map((d) => (
                  <th key={d} className="w-8 h-6 text-center">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, i) => (
                <tr key={i}>
                  {week.map((day, j) => (
                    <td key={j} className="w-8 h-6 text-center">
                      {day || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Clock;

