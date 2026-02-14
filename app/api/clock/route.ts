export const runtime = 'edge';

export function GET(request: Request) {
  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const sendTimestamp = () => {
        const payload = `data: ${new Date().toISOString()}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      sendTimestamp();
      intervalId = setInterval(sendTimestamp, 1000);
    },
    cancel() {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
      }
    },
  });

  if (request.signal) {
    request.signal.addEventListener(
      'abort',
      () => {
        if (intervalId !== undefined) {
          clearInterval(intervalId);
        }
      },
      { once: true },
    );
  }

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
