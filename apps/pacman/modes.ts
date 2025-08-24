import { GhostMode } from "./Ghost";

export interface ModeStep {
  mode: GhostMode;
  /** duration in seconds */
  duration: number;
}

export const DEFAULT_MODE_SCHEDULE: ModeStep[] = [
  { mode: "scatter", duration: 7 },
  { mode: "chase", duration: 20 },
  { mode: "scatter", duration: 7 },
  { mode: "chase", duration: 20 },
  { mode: "scatter", duration: 5 },
  { mode: "chase", duration: 20 },
  { mode: "scatter", duration: 5 },
  { mode: "chase", duration: Infinity },
];

export class ModeController {
  private schedule: ModeStep[];
  private index = 0;
  private timer = 0; // in frames

  constructor(schedule: ModeStep[] = DEFAULT_MODE_SCHEDULE) {
    this.schedule = schedule;
  }

  /** advance one frame and return current mode */
  tick(): GhostMode {
    this.timer++;
    const current = this.schedule[this.index];
    if (
      this.index < this.schedule.length - 1 &&
      this.timer > current.duration * 60
    ) {
      this.index++;
      this.timer = 0;
    }
    return this.schedule[this.index].mode;
  }

  currentMode(): GhostMode {
    return this.schedule[this.index].mode;
  }

  reset() {
    this.index = 0;
    this.timer = 0;
  }
}

