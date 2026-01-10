const buildChecksum = (payload) => {
  const serialized = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < serialized.length; i += 1) {
    hash = (hash + serialized.charCodeAt(i) * (i + 1)) % 0xffffffff;
  }
  return hash.toString(16);
};

self.onmessage = (event) => {
  const { data } = event;
  if (!data || data.type !== 'create') return;

  const now = Date.now();
  const id = `${now}-${Math.random().toString(36).slice(2, 10)}`;
  const snapshot = {
    id,
    createdAt: now,
    label: data.payload?.label || null,
    reason: data.payload?.reason || 'manual',
    progress: data.payload?.progress ?? 0,
    metadata: data.payload?.metadata || {},
    workerState: data.payload?.workerState || {},
  };

  const checksum = buildChecksum(snapshot);

  self.postMessage({
    type: 'checkpoint',
    payload: { ...snapshot, checksum },
  });
};
