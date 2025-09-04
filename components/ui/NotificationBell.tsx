"use client";

import { useState, type SVGProps } from 'react';
import { useToast } from '../../hooks/useToast';

const BellIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
    />
  </svg>
);

const NotificationBell = () => {
  const { log, dnd, setDnd } = useToast();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen(!open)}
        className="pr-3 pl-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-ubb-orange py-1"
      >
        <BellIcon className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-64 bg-ub-cool-grey text-ubt-grey rounded-md shadow border-black border border-opacity-20 z-50">
          <div className="flex items-center justify-between px-2 py-1 border-b border-black border-opacity-20">
            <span className="font-semibold">Notifications</span>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={dnd}
                onChange={() => setDnd(!dnd)}
              />
              DND
            </label>
          </div>
          <ul className="max-h-60 overflow-auto">
            {log.length ? (
              [...log].reverse().map((t) => (
                <li
                  key={t.id}
                  className="px-2 py-1 border-b border-black border-opacity-10 last:border-0"
                >
                  {t.message}
                </li>
              ))
            ) : (
              <li className="px-2 py-1 text-sm">No notifications</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

