/* eslint-disable no-restricted-globals */
self.onmessage = (e) => {
  const { events = [] } = e.data || {};
  const sorted = events.slice().sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );
  self.postMessage(sorted);
};
