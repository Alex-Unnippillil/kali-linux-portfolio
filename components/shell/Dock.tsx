"use client";

import Image from "next/image";
import React, { useMemo, useState } from "react";
import {
  selectWindowsByApp,
  useWindowManagerState,
  WindowRecord,
} from "../../modules/window-manager/store";

export interface DockApp {
  id: string;
  title: string;
  icon: string;
}

export interface DockProps {
  apps: DockApp[];
  onLaunch: (appId: string) => void;
  orientation?: "vertical" | "horizontal";
}

function getFocusedState(records: WindowRecord[]) {
  return records.some((record) => record.isFocused && !record.isMinimized);
}

export default function Dock({
  apps,
  onLaunch,
  orientation = "vertical",
}: DockProps) {
  const { windows } = useWindowManagerState();
  const [popoverApp, setPopoverApp] = useState<string | null>(null);

  const windowsByApp = useMemo(() => selectWindowsByApp({ windows }), [windows]);

  const directionClasses =
    orientation === "horizontal"
      ? "flex-row px-3 py-2"
      : "flex-col px-2 py-3";

  return (
    <nav
      aria-label="Dock"
      className={`pointer-events-auto flex rounded-2xl bg-black/60 backdrop-blur-md`}
    >
      <ul className={`flex ${directionClasses} gap-2`}>
        {apps.map((app) => {
          const windowList = windowsByApp.get(app.id) ?? [];
          const isRunning = windowList.length > 0;
          const hasFocus = isRunning && getFocusedState(windowList);
          const showPopover = popoverApp === app.id && isRunning;

          const show = () => {
            if (windowList.length > 0) {
              setPopoverApp(app.id);
            }
          };

          const hide = () => {
            setPopoverApp((current) => (current === app.id ? null : current));
          };

          return (
            <li
              key={app.id}
              className="relative"
              onMouseEnter={show}
              onMouseLeave={hide}
            >
              <button
                type="button"
                aria-label={app.title}
                aria-pressed={hasFocus}
                data-app-id={app.id}
                onClick={() => onLaunch(app.id)}
                onFocus={show}
                onBlur={hide}
                className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                  hasFocus ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                <Image
                  src={app.icon}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8"
                />
                {isRunning && (
                  <span
                    aria-hidden="true"
                    data-testid={`dock-indicator-${app.id}`}
                    className={`absolute bottom-1 h-1 w-2 rounded-full bg-white transition-opacity ${
                      hasFocus ? "opacity-100" : "opacity-70"
                    }`}
                  />
                )}
              </button>
              {showPopover && (
                <div
                  role="listbox"
                  aria-label={`Open windows for ${app.title}`}
                  className="absolute left-1/2 top-full z-20 mt-2 w-max -translate-x-1/2 rounded-lg bg-black/80 px-3 py-2 text-xs text-white shadow-lg"
                >
                  {windowList.map((record) => (
                    <div
                      key={record.id}
                      role="option"
                      aria-selected={record.isFocused && !record.isMinimized}
                      className="whitespace-nowrap"
                    >
                      {record.title}
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
