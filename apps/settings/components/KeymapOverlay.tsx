'use client';

import { KeyboardShortcutSettings } from '../keyboard';

interface KeymapOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function KeymapOverlay({ open, onClose }: KeymapOverlayProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/80 p-4 text-white"
      role="dialog"
      aria-modal="true"
    >
      <KeyboardShortcutSettings onClose={onClose} />
    </div>
  );
}
