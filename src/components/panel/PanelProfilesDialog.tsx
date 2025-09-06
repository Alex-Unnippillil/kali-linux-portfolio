"use client";

import Modal from '../../../components/base/Modal';
import { PanelLayout, PANEL_LAYOUT_KEY } from './types';
import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  layout: PanelLayout;
  onLayoutChange: (layout: PanelLayout) => void;
  defaultLayout: PanelLayout;
}

function safeParse(json: string | null): PanelLayout | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function PanelProfilesDialog({
  isOpen,
  onClose,
  layout,
  onLayoutChange,
  defaultLayout,
}: Props) {
  const handleSave = () => {
    try {
      localStorage.setItem(PANEL_LAYOUT_KEY, JSON.stringify(layout));
    } catch (err) {
      console.error('Failed to save panel layout', err);
    }
    onClose();
  };

  const handleLoad = () => {
    const stored = safeParse(localStorage.getItem(PANEL_LAYOUT_KEY));
    if (stored) {
      onLayoutChange(stored);
    }
    onClose();
  };

  const handleReset = () => {
    try {
      localStorage.removeItem(PANEL_LAYOUT_KEY);
    } catch {}
    onLayoutChange(defaultLayout);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-ub-cool-grey text-ubt-grey p-4 rounded shadow w-72">
        <h2 className="text-lg mb-4">Panel Profiles</h2>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1 rounded bg-ubt-red text-white"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleLoad}
            className="px-3 py-1 rounded bg-ubt-blue text-white"
          >
            Load
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1 rounded bg-ubt-green text-white"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
