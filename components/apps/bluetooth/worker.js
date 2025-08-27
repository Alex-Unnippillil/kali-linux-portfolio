let deviceId = 0;
let interval;

function randomDevice() {
  deviceId += 1;
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random(); // 0-1 from center
  const strength = Math.random(); // 0-1
  return {
    id: deviceId,
    name: `Device ${deviceId}`,
    angle,
    distance,
    strength,
  };
}

self.onmessage = (e) => {
  const { command } = e.data || {};
  if (command === 'start' && !interval) {
    interval = setInterval(() => {
      self.postMessage(randomDevice());
    }, 1500);
  }
  if (command === 'stop' && interval) {
    clearInterval(interval);
    interval = null;
  }
};
