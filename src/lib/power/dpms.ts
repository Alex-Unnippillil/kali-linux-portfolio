export type DPMSStage = 'standby' | 'suspend' | 'off';

export interface DPMSTimers {
  standby: number; // milliseconds until standby
  suspend: number; // milliseconds after standby until suspend
  off: number; // milliseconds after suspend until off
}

export interface DPMSOptions extends DPMSTimers {
  /** Callback fired when a stage is reached */
  onStage?: (stage: DPMSStage) => void;
}

/**
 * Simple DPMS (Display Power Management Signaling) helper.
 * Tracks three power saving stages and cancels when user activity is detected.
 */
export function createDPMS({ standby, suspend, off, onStage }: DPMSOptions) {
  let timers: ReturnType<typeof setTimeout>[] = [];

  const schedule = () => {
    let total = 0;
    const stages: [DPMSStage, number][] = [
      ['standby', standby],
      ['suspend', suspend],
      ['off', off],
    ];
    stages.forEach(([stage, delay]) => {
      total += delay;
      timers.push(
        setTimeout(() => {
          onStage?.(stage);
        }, total),
      );
    });
  };

  const clear = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  const handleInput = () => {
    cancel();
  };

  const start = () => {
    clear();
    schedule();
    window.addEventListener('keydown', handleInput);
    window.addEventListener('pointerdown', handleInput);
    window.addEventListener('mousemove', handleInput);
    window.addEventListener('touchstart', handleInput);
    window.addEventListener('wheel', handleInput, { passive: true });
  };

  const cancel = () => {
    clear();
    window.removeEventListener('keydown', handleInput);
    window.removeEventListener('pointerdown', handleInput);
    window.removeEventListener('mousemove', handleInput);
    window.removeEventListener('touchstart', handleInput);
    window.removeEventListener('wheel', handleInput);
  };

  return { start, cancel };
}

export default createDPMS;
