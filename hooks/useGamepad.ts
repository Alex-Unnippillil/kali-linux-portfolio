import { useEffect, useState } from 'react';
import { pollTwinStick, TwinStickState } from '../utils/gamepad';

export default function useGamepad(
  deadzone: number = 0.25,
  fireButtons?: number[],
): TwinStickState {
  const [state, setState] = useState<TwinStickState>(() =>
    pollTwinStick(deadzone, fireButtons),
  );

  useEffect(() => {
    let raf: number;
    const read = () => {
      setState(pollTwinStick(deadzone, fireButtons));
      raf = requestAnimationFrame(read);
    };
    raf = requestAnimationFrame(read);
    return () => cancelAnimationFrame(raf);
  }, [deadzone, fireButtons]);

  return state;
}
