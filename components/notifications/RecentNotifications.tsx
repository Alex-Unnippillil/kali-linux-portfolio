"use client";

import React from "react";
import useNotifications from "../../hooks/useNotifications";

interface RecentNotificationsProps {
  onClose: () => void;
}

const RecentNotifications: React.FC<RecentNotificationsProps> = ({ onClose }) => {
  const { notifications } = useNotifications();
  const items = [...notifications].slice(-50).reverse();

  return (
    <div className="fixed bottom-8 right-8 w-64 max-h-80 overflow-y-auto bg-gray-900 text-white border border-gray-700 rounded shadow-lg z-50">
      <div className="flex items-center justify-between p-2 border-b border-gray-700">
        <span className="text-sm font-semibold">Notifications</span>
        <button aria-label="Close" onClick={onClose} className="text-sm">×</button>
      </div>
      {items.length === 0 ? (
        <p className="p-2 text-xs text-gray-300">No notifications</p>
      ) : (
        <ul className="p-2 space-y-1 text-xs">
          {items.map(n => (
            <li key={n.id}>{n.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RecentNotifications;

