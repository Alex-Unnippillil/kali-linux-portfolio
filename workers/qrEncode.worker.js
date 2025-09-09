import QRCode from 'qrcode';

self.onmessage = async ({ data }) => {
  const { text, opts } = data;
  try {
    const value = text || ' ';
    const png = await QRCode.toDataURL(value, opts);
    const svg = await QRCode.toString(value, { ...opts, type: 'svg' });
    self.postMessage({ png, svg });
  } catch {
    self.postMessage({ png: '', svg: '' });
  }
};

export {};

