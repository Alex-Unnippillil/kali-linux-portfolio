"use client";

import React, { useState } from "react";
import { Icon } from '../ui/Icon';
import { isBrowser } from '@/utils/env';

const PANEL_PREFIX = "xfce.panel.";

interface AppMeta {
  id: string;
  title: string;
}

interface Props {
  apps: AppMeta[];
  focused_windows: Record<string, boolean>;
  minimize?: (id: string) => void;
  maximize?: (id: string) => void;
  close?: (id: string) => void;
}

interface ButtonSettings {
  minimize: boolean;
  maximize: boolean;
  close: boolean;
}

export default function ActiveWindowTitle({
  apps,
  focused_windows,
  minimize,
  maximize,
  close,
}: Props) {
  const [buttons] = useState<ButtonSettings>(() => {
    if (!isBrowser()) {
      return { minimize: false, maximize: false, close: false };
    }
    try {
      const stored = window.localStorage.getItem(`${PANEL_PREFIX}window-buttons`);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          minimize: !!parsed.minimize,
          maximize: !!parsed.maximize,
          close: !!parsed.close,
        };
      }
    } catch {
      // ignore malformed storage
    }
    return { minimize: false, maximize: false, close: false };
  });

  const activeId = Object.keys(focused_windows).find((id) => focused_windows[id]);
  if (!activeId) return null;

  const app = apps.find((a) => a.id === activeId);
  if (!app) return null;

  return (
    <div className="flex items-center space-x-2 text-white" data-testid="active-window-title">
      <span className="truncate">{app.title}</span>
      {buttons.minimize && minimize && (
        <button
          type="button"
          aria-label="Window minimize"
          className="h-5 w-5 flex items-center justify-center rounded hover:bg-white hover:bg-opacity-10"
          onClick={() => minimize(activeId)}
        >
          <Icon name="minimize" className="h-3 w-3" />
        </button>
      )}
      {buttons.maximize && maximize && (
        <button
          type="button"
          aria-label="Window maximize"
          className="h-5 w-5 flex items-center justify-center rounded hover:bg-white hover:bg-opacity-10"
          onClick={() => maximize(activeId)}
        >
          <Icon name="maximize" className="h-3 w-3" />
        </button>
      )}
      {buttons.close && close && (
        <button
          type="button"
          aria-label="Window close"
          className="h-5 w-5 flex items-center justify-center rounded hover:bg-white hover:bg-opacity-10"
          onClick={() => close(activeId)}
        >
          <Icon name="close" className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

