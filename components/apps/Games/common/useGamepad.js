import { useEffect, useState } from 'react';
/**
 * React hook wrapper around the Gamepad API. Polls at animation frame rate
 * and returns button/axis state. Only the first connected gamepad is used.
 */
export default function useGamepad() {
    const [state, setState] = useState({ buttons: [], axes: [] });
    useEffect(() => {
        let raf;
        const read = () => {
            const pads = navigator.getGamepads?.();
            const pad = pads && pads[0];
            if (pad) {
                setState({
                    buttons: pad.buttons.map((b) => b.value),
                    axes: Array.from(pad.axes),
                });
            }
            raf = requestAnimationFrame(read);
        };
        raf = requestAnimationFrame(read);
        return () => cancelAnimationFrame(raf);
    }, []);
    return state;
}
