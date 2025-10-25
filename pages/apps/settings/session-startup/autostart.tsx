"use client";

import { useEffect, useState } from "react";
import {
  getAutostart,
  setAutostart,
  type AutostartEntry,
  type Trigger,
} from "../../../../utils/autostartStore";

const TRIGGER_OPTIONS: { value: Trigger; label: string }[] = [
  { value: "login", label: "On login" },
  { value: "logout", label: "On logout" },
  { value: "suspend", label: "On suspend/resume" },
];

function triggerLabel(trigger: Trigger) {
  const opt = TRIGGER_OPTIONS.find((t) => t.value === trigger);
  return opt ? opt.label : trigger;
}

export default function AutostartSettings() {
  const [entries, setEntries] = useState<AutostartEntry[]>([]);

  useEffect(() => {
    getAutostart().then(setEntries);
  }, []);

  const handleTriggerChange = (index: number, trigger: Trigger) => {
    const updated = entries.map((e, i) =>
      i === index ? { ...e, trigger } : e
    );
    setEntries(updated);
    setAutostart(updated);
  };

  if (!entries.length) {
    return (
      <div className="p-4 text-ubt-grey">
        <p>No autostart entries configured.</p>
      </div>
    );
  }

  return (
    <div className="p-4 text-ubt-grey">
      <ul className="space-y-3">
        {entries.map((entry, idx) => (
          <li
            key={entry.id}
            className="flex items-center justify-between p-2 rounded bg-ub-cool-grey border border-ubt-cool-grey"
          >
            <span>{entry.name}</span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs rounded-full bg-blue-600 text-white">
                {triggerLabel(entry.trigger)}
              </span>
              <select
                value={entry.trigger}
                onChange={(e) =>
                  handleTriggerChange(idx, e.target.value as Trigger)
                }
                className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
              >
                {TRIGGER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

