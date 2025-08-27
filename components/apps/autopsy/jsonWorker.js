/* eslint-disable no-restricted-globals */
self.onmessage = (e) => {
  try {
    const data = JSON.parse(e.data);
    self.postMessage(data.artifacts || []);
  } catch {
    self.postMessage([]);
  }
};
