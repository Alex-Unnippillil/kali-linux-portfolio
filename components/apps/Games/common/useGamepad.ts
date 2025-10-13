import { useEffect, useState } from 'react';
import { useWindowLifecycle } from '../../../desktop/Window';

export interface GamepadState {
  buttons: number[];
  axes: number[];
  connected: boolean;
}

/**
 * React hook wrapper around the Gamepad API. Polls at animation frame rate
 * and returns button/axis state. Only the first connected gamepad is used.
 */
export default function useGamepad(): GamepadState {
  const [state, setState] = useState<GamepadState>({
    buttons: [],
    axes: [],
    connected: false,
  });
  const { isForeground } = useWindowLifecycle();

  useEffect(() => {
    const handleConnect = () =>
      setState((s) => ({ ...s, connected: true }));
    const handleDisconnect = () =>
      setState({ buttons: [], axes: [], connected: false });
    window.addEventListener("gamepadconnected", handleConnect);
    window.addEventListener("gamepaddisconnected", handleDisconnect);
    return () => {
      window.removeEventListener("gamepadconnected", handleConnect);
      window.removeEventListener("gamepaddisconnected", handleDisconnect);
    };
  }, []);

  useEffect(() => {
    if (!isForeground) {
      return undefined;
    }
    let raf: number;
    const read = () => {
      const pads = navigator.getGamepads?.();
      const pad = pads && pads[0];
      if (pad) {
        setState({
          buttons: pad.buttons.map((b) => b.value),
          axes: Array.from(pad.axes),
          connected: true,
        });
      } else if (state.connected) {
        setState({ buttons: [], axes: [], connected: false });
      }
      raf = requestAnimationFrame(read);
    };
    raf = requestAnimationFrame(read);
    return () => cancelAnimationFrame(raf);
  }, [state.connected, isForeground]);

  return state;
}
