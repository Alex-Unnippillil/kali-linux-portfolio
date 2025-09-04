import { useEffect, useState } from 'react';
import { pollTwinStick, TwinStickState } from '../utils/gamepad';

export default function useGamepad(
  deadzone: number = 0.25,
  vibrate = false,
): TwinStickState {
  const [state, setState] = useState<TwinStickState>(() =>
    pollTwinStick(deadzone, vibrate),
  );

  useEffect(() => {
    let raf: number;
    const read = () => {
      setState(pollTwinStick(deadzone, vibrate));
      raf = requestAnimationFrame(read);
    };
    raf = requestAnimationFrame(read);
    return () => cancelAnimationFrame(raf);
  }, [deadzone, vibrate]);

  return state;
}
