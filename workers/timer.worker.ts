export interface StartMessage {
  action: 'start';
  interval: number;
}

export interface StopMessage {
  action: 'stop';
}

export type TimerWorkerRequest = StartMessage | StopMessage;

export type TimerWorkerResponse = 'tick';

let intervalId: number | null = null;

self.onmessage = ({ data }: MessageEvent<TimerWorkerRequest>) => {
  if (data.action === 'start') {
    const { interval } = data;
    if (typeof interval === 'number') {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
      intervalId = self.setInterval(
        () => self.postMessage('tick' as TimerWorkerResponse),
        interval,
      );
    }
  } else if (data.action === 'stop') {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
};

export {};

