import React, { useCallback, useEffect } from 'react';
import { usePipPortal } from '../components/common/PipPortal';

export default function useDocPiP(render: () => React.ReactNode) {
  const { open, close, isOpen } = usePipPortal();

  const pin = useCallback(async () => {
    await open(render());
  }, [open, render]);

  const unpin = useCallback(() => {
    close();
  }, [close]);

  const togglePin = useCallback(async () => {
    if (isOpen) {
      unpin();
    } else {
      await pin();
    }
  }, [isOpen, pin, unpin]);

  useEffect(() => {
    return () => close();
  }, [close]);

  return { isPinned: isOpen, pin, unpin, togglePin };
}
