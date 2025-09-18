import { useEffect, useState } from 'react';
import {
  getBluetoothState,
  subscribeToBluetooth,
  startPairing,
  retryPairing,
  disconnectDevice,
} from '../utils/bluetoothManager';

type BluetoothControllerState = ReturnType<typeof getBluetoothState>;

const useBluetoothController = () => {
  const [state, setState] = useState<BluetoothControllerState>(() => getBluetoothState());

  useEffect(() => {
    const unsubscribe = subscribeToBluetooth((next) => {
      setState(next);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...state,
    startPairing,
    retryPairing,
    disconnectDevice,
  };
};

export default useBluetoothController;
