const encoder = new TextEncoder();

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export function GET(request: Request) {
  let tickInterval: ReturnType<typeof setInterval> | undefined;
  let keepAliveInterval: ReturnType<typeof setInterval> | undefined;
  let abortListener: (() => void) | undefined;

  const cleanup = () => {
    if (tickInterval) {
      clearInterval(tickInterval);
      tickInterval = undefined;
    }

    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = undefined;
    }

    if (abortListener) {
      request.signal.removeEventListener('abort', abortListener);
      abortListener = undefined;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let counter = 0;

      const sendTick = () => {
        counter += 1;
        const payload = `data: tick ${counter}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      const sendKeepAlive = () => {
        controller.enqueue(encoder.encode(': keep-alive\n\n'));
      };

      sendTick();
      tickInterval = setInterval(sendTick, 1000);
      keepAliveInterval = setInterval(sendKeepAlive, 15000);

      abortListener = () => {
        cleanup();
        controller.close();
      };

      request.signal.addEventListener('abort', abortListener);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
