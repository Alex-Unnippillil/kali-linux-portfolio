import { BrowserQRCodeReader } from "@zxing/browser";

let reader: BrowserQRCodeReader | null = null;

function getReader() {
  if (!reader) {
    reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 300 });
  }
  return reader;
}

export async function decodeQrFile(file: File): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("QR decoding is only available in the browser");
  }
  const readerInstance = getReader();
  const url = URL.createObjectURL(file);
  try {
    const result = await readerInstance.decodeFromImageUrl(url);
    return result.getText();
  } finally {
    URL.revokeObjectURL(url);
  }
}
