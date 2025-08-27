import QRCode from 'qrcode';
import jsQR from 'jsqr';

export const generateDataUrl = (text) => {
  if (!text) return Promise.resolve('');
  return QRCode.toDataURL(text);
};

export const decodeImageData = (imageData) => {
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  return code ? code.data : '';
};
