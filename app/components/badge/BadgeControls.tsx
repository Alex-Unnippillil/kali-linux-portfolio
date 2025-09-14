'use client';

import { useCallback } from 'react';

const BadgeControls = () => {
  const setBadge = useCallback(async () => {
    try {
      if ('setAppBadge' in navigator) {
        await (navigator as any).setAppBadge(1);
      }
    } catch (err) {
      console.error('Failed to set app badge', err);
    }
  }, []);

  const clearBadge = useCallback(async () => {
    try {
      if ('clearAppBadge' in navigator) {
        await (navigator as any).clearAppBadge();
      }
    } catch (err) {
      console.error('Failed to clear app badge', err);
    }
  }, []);

  if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) {
    return null;
  }

  return (
    <div className="flex gap-2">
      <button type="button" onClick={setBadge} className="px-2 py-1 border rounded">
        Set Badge
      </button>
      <button type="button" onClick={clearBadge} className="px-2 py-1 border rounded">
        Clear Badge
      </button>
    </div>
  );
};

export default BadgeControls;
