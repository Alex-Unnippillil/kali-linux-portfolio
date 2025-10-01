'use client';

import { useContext } from 'react';
import { OverlayContext, OverlayManager } from '../components/common/OverlayHost';

export const useOverlay = (): OverlayManager => {
  const context = useContext(OverlayContext);
  if (!context) {
    throw new Error('useOverlay must be used within an OverlayHost');
  }
  return context;
};

export default useOverlay;
