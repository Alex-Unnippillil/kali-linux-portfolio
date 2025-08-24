'use client';
import React from 'react';

// Simple hook to trigger a short vibration when supported by the browser.
function useHaptics() {
  return React.useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, []);
}

export default function TouchControls() {
  const haptic = useHaptics();
  const commonClasses =
    'w-14 h-14 bg-black/80 text-white rounded flex items-center justify-center text-2xl sm:text-3xl focus:outline-none focus:ring-2 focus:ring-offset-2';
  return (
    <div
      className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-4"
      role="group"
      aria-label="touch controls"
    >
      <button
        className={commonClasses}
        aria-label="move left"
        onTouchStart={haptic}
        onClick={haptic}
      >
        ◀
      </button>
      <button
        className={commonClasses}
        aria-label="jump"
        onTouchStart={haptic}
        onClick={haptic}
      >
        ▲
      </button>
      <button
        className={commonClasses}
        aria-label="move right"
        onTouchStart={haptic}
        onClick={haptic}
      >
        ▶
      </button>
    </div>
  );
}
