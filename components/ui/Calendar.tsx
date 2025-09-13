"use client";

import { useState } from 'react';

interface Props {
  open: boolean;
}

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const Calendar = ({ open }: Props) => {
  const today = new Date();
  const [current, setCurrent] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks: (number | null)[][] = [];
  let day = 1 - firstDay;
  for (let i = 0; i < 6; i++) {
    const week: (number | null)[] = [];
    for (let j = 0; j < 7; j++, day++) {
      if (day > 0 && day <= daysInMonth) {
        week.push(day);
      } else {
        week.push(null);
      }
    }
    weeks.push(week);
  }

  const prevMonth = () => setCurrent(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrent(new Date(year, month + 1, 1));

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md top-9 right-1 shadow border border-black border-opacity-20 text-xs w-64 ${
        open ? '' : 'hidden'
      }`}
    >
      <div className="flex justify-between items-center px-4 py-2">
        <button onClick={prevMonth} aria-label="Previous month" className="px-2">
          &lt;
        </button>
        <div>
          {monthNames[month]} {year}
        </div>
        <button onClick={nextMonth} aria-label="Next month" className="px-2">
          &gt;
        </button>
      </div>
      <div className="grid grid-cols-7 text-center px-2 pb-2">
        {daysOfWeek.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
        {weeks.map((week, i) =>
          week.map((d, j) => {
            const isToday =
              d === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();
            return (
              <div
                key={`${i}-${j}`}
                className={`py-1 ${
                  d ? '' : 'text-ubt-grey'
                } ${isToday ? 'bg-ubt-grey text-black rounded' : ''}`}
              >
                {d || ''}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Calendar;

