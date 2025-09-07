"use client";

import React, { useState } from 'react';
import Toast from "./ui/Toast";

const SessionManager: React.FC = () => {
  const [toast, setToast] = useState("");

  const handleClear = async () => {
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true') {
      try {
        const res = await fetch("/api/clear-sessions", { method: "POST" });
        if (!res.ok) throw new Error("Failed");
        setToast("Sessions cleared");
      } catch {
        setToast("Failed to clear sessions");
      }
    } else {
      setToast("Unavailable in static export");
    }
  };

  return (
    <div className="p-4 space-y-2 text-white bg-ub-cool-grey h-full">
      <button
        type="button"
        onClick={handleClear}
        className="px-2 py-1 bg-gray-700 hover:bg-gray-600"
      >
        Clear saved sessions
      </button>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
};

export default SessionManager;
