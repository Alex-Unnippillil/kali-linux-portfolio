import React from 'react';

// Helper to normalize pointer events for both mouse and touch
// Returns props that can be spread onto an element to handle both
// mouse and touch interactions consistently.
export const pointerHandlers = (handler: () => void) => ({
  onClick: () => handler(),
  onTouchStart: (e: React.TouchEvent) => {
    e.preventDefault();
    handler();
  },
});

export default pointerHandlers;
