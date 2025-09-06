"use client";
import { useSettings } from "../../../hooks/useSettings";
import ToggleSwitch from "../../../components/ToggleSwitch";

const ALL_BUTTONS = ["menu", "minimize", "maximize", "close"] as const;
type Button = typeof ALL_BUTTONS[number];

export default function WindowControls() {
  const { windowButtons, setWindowButtons } = useSettings();

  const move = (index: number, dir: number) => {
    const updated = [...windowButtons];
    const [item] = updated.splice(index, 1);
    updated.splice(index + dir, 0, item);
    setWindowButtons(updated);
  };

  const toggle = (btn: Button) => {
    if (windowButtons.includes(btn)) {
      setWindowButtons(windowButtons.filter((b) => b !== btn));
    } else {
      setWindowButtons([...windowButtons, btn]);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-4">
      {windowButtons.map((btn, idx) => (
        <div key={btn} className="flex items-center gap-2">
          <span className="capitalize flex-1">{btn}</span>
          <button
            aria-label={`Move ${btn} up`}
            disabled={idx === 0}
            onClick={() => move(idx, -1)}
            className="px-2 py-1 bg-ub-cool-grey rounded disabled:opacity-50"
          >
            ↑
          </button>
          <button
            aria-label={`Move ${btn} down`}
            disabled={idx === windowButtons.length - 1}
            onClick={() => move(idx, 1)}
            className="px-2 py-1 bg-ub-cool-grey rounded disabled:opacity-50"
          >
            ↓
          </button>
          <ToggleSwitch
            checked={true}
            onChange={() => toggle(btn)}
            ariaLabel={`Toggle ${btn}`}
          />
        </div>
      ))}
      {ALL_BUTTONS.filter((b) => !windowButtons.includes(b)).map((btn) => (
        <div key={btn} className="flex items-center gap-2">
          <span className="capitalize flex-1">{btn}</span>
          <button
            aria-label={`Move ${btn} up`}
            disabled
            className="px-2 py-1 bg-ub-cool-grey rounded opacity-50 cursor-not-allowed"
          >
            ↑
          </button>
          <button
            aria-label={`Move ${btn} down`}
            disabled
            className="px-2 py-1 bg-ub-cool-grey rounded opacity-50 cursor-not-allowed"
          >
            ↓
          </button>
          <ToggleSwitch
            checked={false}
            onChange={() => toggle(btn)}
            ariaLabel={`Toggle ${btn}`}
          />
        </div>
      ))}
    </div>
  );
}
