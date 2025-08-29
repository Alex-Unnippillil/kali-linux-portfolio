import QRCode from 'qrcode';
import type { QRCodeToStringOptions } from 'qrcode';

interface EncodeRequest {
  text: string;
  opts: QRCodeToStringOptions;
}

self.onmessage = async ({ data }: MessageEvent<EncodeRequest>) => {
  const { text, opts } = data;
  try {
    const value = text || ' ';
    const png = await QRCode.toDataURL(value, opts);
    const svg = await QRCode.toString(value, { ...opts, type: 'svg' });
    (self as any).postMessage({ png, svg });
  } catch {
    (self as any).postMessage({ png: '', svg: '' });
  }
};

export {};
