export interface InputEvent<T = any> {
  t: number; // milliseconds since start
  data: T;
}

export class Replay<T = any> {
  private events: InputEvent<T>[] = [];
  private start = 0;

  startRecording(): void {
    this.events = [];
    this.start = Date.now();
  }

  record(data: T): void {
    const t = Date.now() - this.start;
    const last = this.events[this.events.length - 1]?.t ?? -1;
    this.events.push({ t: t <= last ? last + 1 : t, data });
  }

  getEvents(): InputEvent<T>[] {
    return this.events;
  }

  // Play back events up to a given time (ms). Defaults to full playback
  play(process: (data: T) => void, time = Infinity): void {
    for (const evt of this.events) {
      if (evt.t > time) break;
      process(evt.data);
    }
  }

  duration(): number {
    return this.events.length ? this.events[this.events.length - 1].t : 0;
  }
}
