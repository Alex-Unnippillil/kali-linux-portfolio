import React, { useState } from 'react';

/**
 * Simple on screen virtual controls used for touch devices.
 * They disappear after a keyboard or gamepad input is detected.
 */
export default function VirtualControls({ lastInput }) {
  const [hidden, setHidden] = useState(false);

  // hide when lastInput is keyboard or gamepad
  React.useEffect(() => {
    if (lastInput === 'keyboard' || lastInput === 'gamepad') {
      setHidden(true);
    }
  }, [lastInput]);

  if (hidden) return null;

  return (
    <div
      className="absolute bottom-4 right-4 flex flex-col gap-2 z-20"
      data-testid="virtual-controls"
    >
      <button className="bg-gray-700 text-white rounded p-2">▲</button>
      <div className="flex gap-2">
        <button className="bg-gray-700 text-white rounded p-2">◀</button>
        <button className="bg-gray-700 text-white rounded p-2">▶</button>
      </div>
      <button className="bg-gray-700 text-white rounded p-2">▼</button>
    </div>
  );
}
