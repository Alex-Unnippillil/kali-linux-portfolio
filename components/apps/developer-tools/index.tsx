"use client";

import React, { useRef } from "react";
import ToggleSwitch from "../../ToggleSwitch";
import { useColorSimulator } from "../../dev/ColorSimulatorProvider";

const MODES = [
  {
    id: "deutan" as const,
    label: "Deutan",
    description: "Balances red/green channels for deuteranopia simulation.",
  },
  {
    id: "protan" as const,
    label: "Protan",
    description: "Simulates protanopia by reducing long-wavelength sensitivity.",
  },
  {
    id: "tritan" as const,
    label: "Tritan",
    description: "Approximates blue/yellow perception loss (tritanopia).",
  },
];

type ModeId = (typeof MODES)[number]["id"];

const DeveloperTools: React.FC = () => {
  const { enabled, setEnabled, mode, setMode } = useColorSimulator();
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const focusAt = (index: number) => {
    const node = buttonsRef.current[index];
    if (node) {
      node.focus();
    }
  };

  const handleKeyDown = (index: number, id: ModeId) =>
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        const next = (index + 1) % MODES.length;
        focusAt(next);
        setMode(MODES[next].id);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        const previous = (index - 1 + MODES.length) % MODES.length;
        focusAt(previous);
        setMode(MODES[previous].id);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusAt(0);
        setMode(MODES[0].id);
      } else if (event.key === "End") {
        event.preventDefault();
        const last = MODES.length - 1;
        focusAt(last);
        setMode(MODES[last].id);
      } else if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setMode(id);
      }
    };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-ub-cool-grey text-white">
      <header className="border-b border-white/10 bg-black/20 px-6 py-4">
        <h1 className="text-2xl font-semibold">Developer Tools</h1>
        <p className="mt-1 max-w-2xl text-sm text-ubt-grey">
          Visualize common color vision deficiencies without leaving the browser.
          Filters are simulated with SVG color matrices and never capture screen content.
        </p>
      </header>
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-lg border border-white/10 bg-black/25 p-5 shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Color simulator overlay</h2>
              <p className="text-xs text-ubt-grey">
                Updates are throttled with requestAnimationFrame, keeping overhead under 5{"\u00A0"}ms per frame on mainstream GPUs.
              </p>
            </div>
            <ToggleSwitch
              checked={enabled}
              onChange={setEnabled}
              ariaLabel={
                enabled
                  ? "Disable color simulator overlay"
                  : "Enable color simulator overlay"
              }
            />
          </div>
          <div
            role="radiogroup"
            aria-label="Color vision simulation"
            className="grid gap-3 sm:grid-cols-3"
          >
            {MODES.map((item, index) => {
              const isActive = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  tabIndex={isActive ? 0 : -1}
                  ref={(node) => {
                    buttonsRef.current[index] = node;
                  }}
                  onKeyDown={handleKeyDown(index, item.id)}
                  onClick={() => setMode(item.id)}
                  className={`rounded-lg border px-3 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange ${
                    isActive
                      ? "border-ub-orange bg-ub-orange/20"
                      : "border-white/10 bg-black/30 hover:border-ub-orange/60 hover:bg-black/40"
                  }`}
                >
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="mt-2 block text-xs text-ubt-grey">
                    {item.description}
                  </span>
                  <span className="mt-3 inline-flex items-center gap-2 text-[11px] text-ubt-grey/80">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        isActive && enabled ? "bg-ub-orange" : "bg-ubt-grey"
                      }`}
                      aria-hidden="true"
                    />
                    {isActive && enabled ? "Active" : "Preview"}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="rounded-md border border-white/10 bg-black/30 p-3 text-xs text-ubt-grey">
            <p>
              Tip: toggle modes with the arrow keys while the group is focused. The overlay only runs locally and resets when you close the tab.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DeveloperTools;
