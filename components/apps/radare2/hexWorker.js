let paused = false;

self.onmessage = (e) => {
  const data = e.data || {};
  if (data.type === 'pause') {
    paused = true;
    return;
  }
  if (data.type === 'resume') {
    paused = false;
    return;
  }
  if (paused) return;
  const hex = (data.hex || '').replace(/[^0-9a-fA-F]/g, '');
  const bytes = hex.match(/.{1,2}/g) || [];
  postMessage(bytes);
};
