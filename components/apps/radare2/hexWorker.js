self.onmessage = (e) => {
  const hex = (e.data || '').replace(/[^0-9a-fA-F]/g, '');
  const bytes = hex.match(/.{1,2}/g) || [];
  postMessage(bytes);
};
