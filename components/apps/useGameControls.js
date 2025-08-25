import { useEffect, useRef } from 'react';

export default function useGameControls(canvasRef) {
  const state = useRef({
    keys: {},
    joystick: { active: false, id: null, sx: 0, sy: 0, x: 0, y: 0 },
    fire: false,
    hyperspace: false,
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      state.current.keys[e.code] = true;
      if (e.code === 'Space') state.current.fire = true;
      if (e.code === 'ShiftLeft') state.current.hyperspace = true;
    };
    const handleKeyUp = (e) => {
      state.current.keys[e.code] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const canvas = canvasRef.current;
    const joystick = state.current.joystick;

    const pointerDown = (e) => {
      if (e.pointerType === 'touch' && !joystick.active) {
        joystick.active = true;
        joystick.id = e.pointerId;
        joystick.sx = e.clientX;
        joystick.sy = e.clientY;
      } else if (e.pointerType === 'touch') {
        state.current.fire = true;
      }
    };
    const pointerMove = (e) => {
      if (e.pointerId === joystick.id) {
        joystick.x = (e.clientX - joystick.sx) / 40;
        joystick.y = (e.clientY - joystick.sy) / 40;
      }
    };
    const pointerUp = (e) => {
      if (e.pointerId === joystick.id) {
        joystick.active = false;
        joystick.x = 0;
        joystick.y = 0;
      }
    };
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
    };
  }, [canvasRef]);

  return state;
}
