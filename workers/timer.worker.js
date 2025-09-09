let intervalId = null;

self.onmessage = ({ data }) => {
  if (data.action === 'start') {
    const { interval } = data;
    if (typeof interval === 'number') {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
      intervalId = self.setInterval(() => self.postMessage('tick'), interval);
    }
  } else if (data.action === 'stop') {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
};

export {};

