export async function recordCanvas(
  canvas: HTMLCanvasElement,
  duration = 1000,
  options: MediaRecorderOptions = { mimeType: 'video/webm' }
): Promise<Blob> {
  // Fallback to PNG snapshot when MediaRecorder is unavailable
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Snapshot failed'))),
        'image/png'
      )
    );
  }

  const stream = canvas.captureStream();
  return new Promise((resolve, reject) => {
    try {
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream, options);
      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.onerror = () => {
        // On error, fallback to snapshot
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Snapshot failed'))),
          'image/png'
        );
      };
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: options.mimeType || 'video/webm' }));
      };
      recorder.start();
      setTimeout(() => recorder.stop(), duration);
    } catch {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Snapshot failed'))),
        'image/png'
      );
    }
  });
}
