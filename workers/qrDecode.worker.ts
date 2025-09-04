import {
  BinaryBitmap,
  HybridBinarizer,
  QRCodeReader,
  RGBLuminanceSource,
} from "@zxing/library";

interface DecodeRequest {
  buffer: ArrayBuffer;
  width: number;
  height: number;
}

const reader = new QRCodeReader();

self.onmessage = ({ data }: MessageEvent<DecodeRequest>) => {
  const { buffer, width, height } = data;
  try {
    const luminance = new RGBLuminanceSource(
      new Int32Array(buffer),
      width,
      height,
    );
    const binary = new BinaryBitmap(new HybridBinarizer(luminance));
    const result = reader.decode(binary);
    (self as any).postMessage({ text: result.getText() });
  } catch {
    (self as any).postMessage({ text: null });
  } finally {
    reader.reset();
  }
};

export {};
