import React from 'react';
import { GAME_INSTRUCTIONS } from '../components/apps/HelpOverlay';

export default function AccessibilityPage() {
  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Accessibility & Shortcuts</h1>
      <p>
        Press <kbd>F1</kbd> in any game to open its help overlay. Press <kbd>?</kbd> to
        view global keyboard shortcuts. Accessibility preferences such as reduced
        motion, high contrast, and font scaling are available in the Settings app.
      </p>
      <h2 className="text-xl font-semibold mt-4">Game Controls</h2>
      <ul className="space-y-4">
        {Object.entries(GAME_INSTRUCTIONS).map(([id, info]) => (
          <li key={id}>
            <h3 className="font-medium">{id}</h3>
            <p>
              <strong>Objective:</strong> {info.objective}
            </p>
            <p>
              <strong>Controls:</strong> {info.controls}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
