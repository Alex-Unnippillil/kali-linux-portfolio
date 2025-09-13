import React from 'react';

interface Props {
  open: boolean;
}

const CalendarPopover = ({ open }: Props) => {
  const now = new Date();
  const date = now.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return (
    <div
      role="dialog"
      className={`absolute top-9 left-1/2 -translate-x-1/2 bg-ub-cool-grey text-white p-4 rounded shadow border border-black border-opacity-20 ${open ? '' : 'hidden'}`}
    >
      <time dateTime={now.toISOString()}>{date}</time>
    </div>
  );
};

export default CalendarPopover;
