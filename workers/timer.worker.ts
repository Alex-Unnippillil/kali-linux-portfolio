const CONNECT_MESSAGE = '__connect__';
const RELEASE_MESSAGE = '__release__';

type TimerCommand = {
  action: number;
  interval?: number;
};

export type TimerWorkerRequest = ArrayBuffer | TimerCommand;

export type TimerWorkerResponse = 'tick';

const timers = new WeakMap<MessagePort, number | null>();

const decodeCommand = (payload: ArrayBuffer | TimerCommand): TimerCommand => {
  if (payload instanceof ArrayBuffer) {
    const view = new Int32Array(payload);
    return { action: view[0], interval: view[1] };
  }
  return payload;
};

const startTimer = (port: MessagePort, interval: number) => {
  stopTimer(port);
  const id = self.setInterval(() => {
    port.postMessage('tick' as TimerWorkerResponse);
  }, interval);
  timers.set(port, id);
};

const stopTimer = (port: MessagePort) => {
  const current = timers.get(port);
  if (typeof current === 'number') {
    clearInterval(current);
    timers.set(port, null);
  }
};

const connectPort = (port: MessagePort) => {
  const handleMessage = (event: MessageEvent<TimerWorkerRequest>) => {
    const data = event.data as TimerWorkerRequest & { type?: string };
    if (data && typeof (data as { type?: string }).type === 'string') {
      if ((data as { type?: string }).type === RELEASE_MESSAGE) {
        stopTimer(port);
        port.removeEventListener('message', handleMessage as EventListener);
        port.close();
      }
      return;
    }

    const command = decodeCommand(data);
    if (command.action === 1 && typeof command.interval === 'number') {
      startTimer(port, command.interval);
    } else if (command.action === 0) {
      stopTimer(port);
    }
  };

  port.addEventListener('message', handleMessage as EventListener);
  port.start();
};

self.addEventListener('message', (event: MessageEvent<{ type?: string }>) => {
  if (event.data?.type === CONNECT_MESSAGE) {
    const [port] = event.ports;
    if (port) {
      connectPort(port);
    }
  }
});

export {};
