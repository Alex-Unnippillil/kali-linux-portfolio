interface NotificationWorkerRequest {
  id: string;
  message: string;
  analyzeText: boolean;
  imageData?: {
    buffer: ArrayBuffer;
    width: number;
    height: number;
  };
}

interface NotificationWorkerResponse {
  id: string;
  message?: string;
  preview?: string;
  averageColor?: string;
}

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();

const computeAverageColor = (buffer: ArrayBuffer): string | undefined => {
  const data = new Uint8ClampedArray(buffer);
  if (data.length === 0) return undefined;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count += 1;
  }
  if (!count) return undefined;
  const avgR = Math.round(r / count);
  const avgG = Math.round(g / count);
  const avgB = Math.round(b / count);
  return `rgb(${avgR} ${avgG} ${avgB})`;
};

self.onmessage = (event: MessageEvent<NotificationWorkerRequest>) => {
  const { id, message, analyzeText, imageData } = event.data;
  let normalizedMessage = message;
  let preview: string | undefined;
  if (analyzeText) {
    normalizedMessage = normalize(message);
    preview = normalizedMessage.length > 280
      ? `${normalizedMessage.slice(0, 277)}…`
      : normalizedMessage;
  }

  let averageColor: string | undefined;
  if (imageData?.buffer) {
    averageColor = computeAverageColor(imageData.buffer);
  }

  const response: NotificationWorkerResponse = {
    id,
    message: analyzeText ? normalizedMessage : undefined,
    preview,
    averageColor,
  };

  (self as any).postMessage(response);
};

export {};
