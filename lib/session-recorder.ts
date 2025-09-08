export type SessionEvent = {
  type: 'input' | 'output';
  data: string;
  timestamp: number;
};

export default class SessionRecorder {
  private events: SessionEvent[] = [];

  private record(type: 'input' | 'output', data: string) {
    this.events.push({ type, data, timestamp: Date.now() });
  }

  recordInput(data: string) {
    this.record('input', data);
  }

  recordOutput(data: string) {
    this.record('output', data);
  }

  getEvents() {
    return this.events;
  }

  toJSON() {
    return JSON.stringify(this.events);
  }

  download(filename = 'terminal-session.json') {
    const blob = new Blob([this.toJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

