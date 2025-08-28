import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from '@zxing/library';

const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
const reader = new MultiFormatReader();
reader.setHints(hints);

self.onmessage = (e) => {
  const { data, width, height } = e.data;
  try {
    const luminances = new Uint8ClampedArray(width * height);
    for (let i = 0; i < width * height; i += 1) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      luminances[i] = Math.round((0.299 * r + 0.587 * g + 0.114 * b));
    }
    const source = new RGBLuminanceSource(luminances, width, height);
    const bitmap = new BinaryBitmap(new HybridBinarizer(source));
    const result = reader.decode(bitmap);
    self.postMessage(result.getText());
  } catch (err) {
    self.postMessage(null);
  }
};

