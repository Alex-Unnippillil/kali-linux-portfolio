import { useEffect, useState } from 'react';
import { pollTwinStick, TwinStickState } from '../utils/gamepad';

export default function useGamepad(deadzone: number = 0.25): TwinStickState {
  const [state, setState] = useState<TwinStickState>(() => pollTwinStick(deadzone));

  useEffect(() => {
    let raf: number;
    const read = () => {
      setState(pollTwinStick(deadzone));
      raf = requestAnimationFrame(read);
    };
    raf = requestAnimationFrame(read);
    return () => cancelAnimationFrame(raf);
  }, [deadzone]);

  return state;
}
