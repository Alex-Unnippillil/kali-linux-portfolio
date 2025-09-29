"use client";

import usePersistentState from "../../hooks/usePersistentState";
import { useMemo } from "react";
import { useSettings, type MeteredOverride } from "../../hooks/useSettings";
import { useMeteredConnection } from "../../hooks/useMeteredConnection";

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [sound, setSound] = usePersistentState("qs-sound", true, (value): value is boolean => typeof value === "boolean");
  const {
    theme,
    setTheme,
    allowNetwork,
    setAllowNetwork,
    reducedMotion,
    setReducedMotion,
    meteredOverride,
    setMeteredOverride,
    backgroundSyncThrottle,
    setBackgroundSyncThrottle,
  } = useSettings();
  const { effectiveMetered, loading, report, describeState } = useMeteredConnection();
  const overrideOptions = useMemo(
    () =>
      [
        { value: "auto", label: "Auto" },
        { value: "force-metered", label: "Force metered" },
        { value: "force-unmetered", label: "Force unmetered" },
      ] as ReadonlyArray<{ value: MeteredOverride; label: string }>,
    [],
  );

  const themeLabel = theme === "dark" ? "Dark" : "Default";

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 ${
        open ? "" : "hidden"
      }`}
    >
      <div className="px-4 pb-2">
        <button
          className="flex w-full justify-between"
          onClick={() => setTheme(theme === "dark" ? "default" : "dark")}
        >
          <span>Theme</span>
          <span>{themeLabel}</span>
        </button>
      </div>
      <div className="flex justify-between px-4 pb-2">
        <span>Sound</span>
        <input type="checkbox" checked={sound} onChange={() => setSound(!sound)} />
      </div>
      <div className="flex justify-between px-4 pb-2">
        <span>Network access</span>
        <input
          type="checkbox"
          checked={allowNetwork}
          onChange={() => setAllowNetwork(!allowNetwork)}
        />
      </div>
      <div className="flex justify-between px-4">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReducedMotion(!reducedMotion)}
        />
      </div>
      <div className="mt-3 border-t border-black border-opacity-20 pt-3 text-[11px] text-ubt-grey">
        <div className="px-4">
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-wide">Metered</span>
            <span className="text-white">{loading ? "…" : effectiveMetered ? "Active" : "Off"}</span>
          </div>
          <p className="mt-1 text-[11px] text-ubt-grey/80">
            {report ? report.summary : "Polling NetworkManager metered state"}
          </p>
          <p className="mt-1 text-[11px] text-ubt-grey/70">{`NM ${describeState}`}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-1 px-4">
          {overrideOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`rounded px-2 py-1 transition ${
                meteredOverride === option.value
                  ? "bg-ub-blue bg-opacity-80 text-white"
                  : "bg-white bg-opacity-10 text-gray-200 hover:bg-opacity-20"
              }`}
              aria-pressed={meteredOverride === option.value}
              onClick={() => setMeteredOverride(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between px-4">
          <span>Throttle sync</span>
          <input
            type="checkbox"
            checked={backgroundSyncThrottle}
            disabled={!effectiveMetered}
            onChange={(event) => setBackgroundSyncThrottle(event.target.checked)}
          />
        </div>
        <p className="px-4 pt-1 text-[11px] text-ubt-grey/70">
          {effectiveMetered
            ? backgroundSyncThrottle
              ? "systemd units slowed for telemetry + sync timers"
              : "Enable to defer background units on metered links"
            : "Turn on metered mode to unlock throttling."}
        </p>
      </div>
    </div>
  );
};

export default QuickSettings;
