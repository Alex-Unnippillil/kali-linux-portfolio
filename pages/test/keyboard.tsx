"use client";
import { useState } from "react";

export default function KeyboardDemo() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState("one");
  const colors = ["red", "green", "blue"] as const;
  const [color, setColor] = useState<typeof colors[number]>("red");

  return (
    <main className="p-4 space-y-4">
      <nav aria-label="Main panel" className="flex gap-2">
        <button id="panel-btn">Panel Button</button>
      </nav>

      <button id="open-drawer" onClick={() => setDrawerOpen(true)}>
        Open Drawer
      </button>

      {drawerOpen && (
        <div
          role="dialog"
          aria-label="Drawer"
          className="fixed inset-0 bg-black/50 flex"
          onKeyDown={(e) => {
            if (e.key === "Escape") setDrawerOpen(false);
          }}
        >
          <div className="m-auto bg-white p-4 space-y-2">
            <button id="close-drawer" onClick={() => setDrawerOpen(false)}>
              Close Drawer
            </button>
            <div
              role="radiogroup"
              aria-label="Palette"
              className="flex gap-2"
              onKeyDown={(e) => {
                const idx = colors.indexOf(color);
                if (e.key === "ArrowRight") {
                  setColor(colors[(idx + 1) % colors.length]);
                } else if (e.key === "ArrowLeft") {
                  setColor(colors[(idx + colors.length - 1) % colors.length]);
                }
              }}
            >
              {colors.map((c) => (
                <button
                  key={c}
                  role="radio"
                  aria-checked={color === c}
                  onClick={() => setColor(c)}
                  style={{ background: c }}
                  className="w-6 h-6 rounded-full border-2 border-black"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div
        role="tablist"
        aria-label="Tabs"
        className="flex gap-2"
        onKeyDown={(e) => {
          const order = ["one", "two", "three"] as const;
          const idx = order.indexOf(tab as any);
          if (e.key === "ArrowRight") {
            setTab(order[(idx + 1) % order.length]);
          } else if (e.key === "ArrowLeft") {
            setTab(order[(idx + order.length - 1) % order.length]);
          }
        }}
      >
        {(["one", "two", "three"] as const).map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            className="px-2 py-1 border"
          >
            {id}
          </button>
        ))}
      </div>

      <button id="open-modal" onClick={() => setModalOpen(true)}>
        Open Modal
      </button>

      {modalOpen && (
        <div
          id="modal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/50 flex"
          onKeyDown={(e) => {
            if (e.key === "Escape") setModalOpen(false);
          }}
        >
          <div className="m-auto bg-white p-4 space-y-2">
            <p>Modal Content</p>
            <button id="close-modal" onClick={() => setModalOpen(false)}>
              Close Modal
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

