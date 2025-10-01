import { hasOffscreenCanvas } from '../feature';

type MessageHandler<Response> = (event: MessageEvent<Response>) => void;

type FallbackEmitter<Response> = (response: Response) => void;

type FallbackRenderer<Message> = {
  handleMessage: (message: Message) => void | Promise<void>;
  dispose?: () => void;
};

export type RendererMode = 'offscreen' | 'fallback' | 'none';

export interface RendererController<Message> {
  mode: RendererMode;
  postMessage: (message: Message, transfer?: Transferable[]) => void;
  dispose: () => void;
}

interface RendererOptions<Message, Response> {
  canvas: HTMLCanvasElement;
  createWorker: () => Worker;
  onMessage?: MessageHandler<Response>;
  fallback: (canvas: HTMLCanvasElement, emit: FallbackEmitter<Response>) => FallbackRenderer<Message>;
  initialMessage?: Message | null | ((mode: RendererMode) => Message | null | undefined);
}

const isWorkerSupported = (): boolean => typeof Worker === 'function';

export const supportsOffscreenWorker = (): boolean =>
  typeof window !== 'undefined' && isWorkerSupported() && hasOffscreenCanvas();

export function setupCanvasRenderer<Message, Response>(
  options: RendererOptions<Message, Response>
): RendererController<Message> {
  if (typeof window === 'undefined') {
    return {
      mode: 'none',
      postMessage: () => undefined,
      dispose: () => undefined,
    };
  }

  const { canvas, createWorker, onMessage, fallback, initialMessage } = options;

  if (supportsOffscreenWorker()) {
    const worker = createWorker();
    const handler: MessageHandler<Response> | null = onMessage ? onMessage : null;

    if (handler) {
      worker.addEventListener('message', handler);
    }

    const offscreen = canvas.transferControlToOffscreen();
    worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);

    const controller: RendererController<Message> = {
      mode: 'offscreen',
      postMessage(message: Message, transfer: Transferable[] = []) {
        worker.postMessage(message, transfer);
      },
      dispose() {
        try {
          worker.postMessage({ type: 'dispose' });
        } catch {
          // ignore worker disposal failures
        }
        if (handler) {
          worker.removeEventListener('message', handler);
        }
        worker.terminate();
      },
    };

    const init = typeof initialMessage === 'function' ? initialMessage(controller.mode) : initialMessage;
    if (init) {
      controller.postMessage(init);
    }

    return controller;
  }

  const emit: FallbackEmitter<Response> = response => {
    if (!onMessage) return;
    const syntheticEvent = { data: response } as MessageEvent<Response>;
    onMessage(syntheticEvent);
  };

  const fallbackRenderer = fallback(canvas, emit);

  const controller: RendererController<Message> = {
    mode: 'fallback',
    postMessage(message: Message) {
      const result = fallbackRenderer.handleMessage(message);
      if (result && typeof (result as Promise<void>).then === 'function') {
        (result as Promise<void>).catch(() => undefined);
      }
    },
    dispose() {
      fallbackRenderer.dispose?.();
    },
  };

  const init = typeof initialMessage === 'function' ? initialMessage(controller.mode) : initialMessage;
  if (init) {
    controller.postMessage(init);
  }

  return controller;
}

export default setupCanvasRenderer;
