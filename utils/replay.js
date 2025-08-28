export class Replay {
    constructor() {
        this.events = [];
        this.start = 0;
    }
    startRecording() {
        this.events = [];
        this.start = Date.now();
    }
    record(data) {
        const t = Date.now() - this.start;
        const last = this.events[this.events.length - 1]?.t ?? -1;
        this.events.push({ t: t <= last ? last + 1 : t, data });
    }
    getEvents() {
        return this.events;
    }
    // Play back events up to a given time (ms). Defaults to full playback
    play(process, time = Infinity) {
        for (const evt of this.events) {
            if (evt.t > time)
                break;
            process(evt.data);
        }
    }
    duration() {
        return this.events.length ? this.events[this.events.length - 1].t : 0;
    }
}
