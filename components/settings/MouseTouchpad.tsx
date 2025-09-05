"use client";

import ToggleSwitch from "../ToggleSwitch";
import { useSettings } from "../../hooks/useSettings";

export default function MouseTouchpad() {
  const {
    tapToClick,
    setTapToClick,
    disableWhileTyping,
    setDisableWhileTyping,
    naturalScroll,
    setNaturalScroll,
    mouseSpeed,
    setMouseSpeed,
    touchpadSpeed,
    setTouchpadSpeed,
  } = useSettings();

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-bold mb-2">Mouse</h2>
        <label htmlFor="mouse-speed" className="block mb-2 text-ubt-grey">
          Pointer Speed
        </label>
        <input
          id="mouse-speed"
          type="range"
          min="0"
          max="100"
          value={mouseSpeed}
          onChange={(e) => setMouseSpeed(parseInt(e.target.value, 10))}
          className="ubuntu-slider w-full"
          aria-label="Mouse pointer speed"
        />
        <div className="mt-2 h-4 w-full bg-ubt-cool-grey">
          <div
            className="h-full bg-ub-orange transition-all"
            style={{ width: `${mouseSpeed}%` }}
          />
        </div>
      </section>
      <section>
        <h2 className="text-lg font-bold mb-2">Touchpad</h2>
        <div className="flex items-center mb-2">
          <span className="mr-2 text-ubt-grey">Tap to Click</span>
          <ToggleSwitch
            checked={tapToClick}
            onChange={setTapToClick}
            ariaLabel="Tap to click"
          />
        </div>
        <div className="flex items-center mb-2">
          <span className="mr-2 text-ubt-grey">Disable While Typing</span>
          <ToggleSwitch
            checked={disableWhileTyping}
            onChange={setDisableWhileTyping}
            ariaLabel="Disable while typing"
          />
        </div>
        <div className="flex items-center mb-4">
          <span className="mr-2 text-ubt-grey">Natural Scrolling</span>
          <ToggleSwitch
            checked={naturalScroll}
            onChange={setNaturalScroll}
            ariaLabel="Natural scrolling"
          />
        </div>
        <label htmlFor="touchpad-speed" className="block mb-2 text-ubt-grey">
          Pointer Speed
        </label>
        <input
          id="touchpad-speed"
          type="range"
          min="0"
          max="100"
          value={touchpadSpeed}
          onChange={(e) => setTouchpadSpeed(parseInt(e.target.value, 10))}
          className="ubuntu-slider w-full"
          aria-label="Touchpad pointer speed"
        />
        <div className="mt-2 h-4 w-full bg-ubt-cool-grey">
          <div
            className="h-full bg-ub-orange transition-all"
            style={{ width: `${touchpadSpeed}%` }}
          />
        </div>
      </section>
    </div>
  );
}

