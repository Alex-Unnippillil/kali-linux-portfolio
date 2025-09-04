"use client";

import { useState } from "react";

export default function SessionActionsButton() {
  const [open, setOpen] = useState(false);

  const actions = [
    {
      label: "Restart session",
      confirm: () => window.confirm("Restart session?"),
    },
    {
      label: "Disconnect",
      confirm: () => window.confirm("Disconnect session?"),
    },
  ];

  const toggle = () => setOpen((o) => !o);

  const handleAction = (action: () => boolean) => {
    action();
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Session actions"
        aria-expanded={open}
        onClick={toggle}
        className="fixed top-2 right-12 z-40 bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center focus:outline-none focus:ring"
      >
        ☰
      </button>
      {open && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setOpen(false)}
          data-testid="session-actions-overlay"
        >
          <div
            className="absolute top-12 right-2 bg-white text-black shadow-lg rounded p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <ul>
              {actions.map((a) => (
                <li key={a.label}>
                  <button
                    type="button"
                    onClick={() => handleAction(a.confirm)}
                    className="block w-full text-left px-2 py-1 hover:bg-gray-100"
                  >
                    {a.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

