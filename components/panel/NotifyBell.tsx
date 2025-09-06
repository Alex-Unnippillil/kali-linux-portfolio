"use client";

import React, { useState } from "react";
import useNotifications from "../../hooks/useNotifications";
import RecentNotifications from "../notifications/RecentNotifications";

const NotifyBell: React.FC = () => {
  const { notifications, doNotDisturb, toggleDoNotDisturb } = useNotifications();
  const [open, setOpen] = useState(false);

  const handleClick = () => setOpen(o => !o);
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleDoNotDisturb();
  };

  return (
    <>
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        aria-label="Notifications"
        className="relative p-1"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2a7 7 0 00-7 7v5.586L3.293 16.293A1 1 0 004 18h16a1 1 0 00.707-1.707L19 14.586V9a7 7 0 00-7-7z" />
          <path d="M9 19a3 3 0 006 0H9z" />
          {doNotDisturb && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="2" />}
        </svg>
        {notifications.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>
      {open && <RecentNotifications onClose={() => setOpen(false)} />}
    </>
  );
};

export default NotifyBell;

