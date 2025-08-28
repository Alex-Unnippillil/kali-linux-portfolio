self.onmessage = (e) => {
  const { command } = e.data || {};
  if (command === 'simulate') {
    // Fake heavy computation
    let total = 0;
    for (let i = 0; i < 5e7; i += 1) {
      total += i;
    }
    self.postMessage('Simulation complete');
  }
};
