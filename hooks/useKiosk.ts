'use client';

import { useEffect, useState } from 'react';
import kioskManager, { KioskManagerState } from '../modules/kiosk/manager';

export const useKiosk = () => {
  const [state, setState] = useState<KioskManagerState>(() => kioskManager.getState());

  useEffect(() => {
    return kioskManager.subscribe(setState);
  }, []);

  return state;
};

export default useKiosk;
