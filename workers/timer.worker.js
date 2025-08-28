let intervalId = null;
self.onmessage = ({ data }) => {
  const { action, interval } = data || {};
  if (action === 'start' && typeof interval === 'number') {
    clearInterval(intervalId);
    intervalId = setInterval(() => self.postMessage('tick'), interval);
  } else if (action === 'stop') {
    clearInterval(intervalId);
    intervalId = null;
  }
};
