'use client';

import ShortcutEditor from './ShortcutEditor';

interface KeymapOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function KeymapOverlay({ open, onClose }: KeymapOverlayProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 text-white p-4 overflow-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-lg w-full space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
          <button
            type="button"
            onClick={() => {
              onClose();
            }}
            className="text-sm underline"
          >
            Close
          </button>
        </div>
        <ShortcutEditor />
      </div>
    </div>
  );
}
