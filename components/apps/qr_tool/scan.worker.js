import jsQR from 'jsqr';

self.onmessage = (e) => {
  const { data, width, height } = e.data;
  const code = jsQR(data, width, height);
  self.postMessage(code ? code.data : null);
};

