export {};

declare const self: DedicatedWorkerGlobalScope;

const ctx: DedicatedWorkerGlobalScope = self;

type WorkerCommand =
    | { type: 'start'; width: number; height: number; sampleRate: number; quality: number }
    | { type: 'frame'; bitmap: ImageBitmap; timestamp: number }
    | { type: 'finish' }
    | { type: 'cancel' };

type WorkerMessage =
    | { type: 'frame'; bitmap: ImageBitmap; timestamp: number }
    | { type: 'progress'; processed: number; total?: number }
    | { type: 'complete' }
    | { type: 'error'; message: string };

let canvas: OffscreenCanvas | null = null;
let width = 0;
let height = 0;
let quality = 0.75;
let cancelled = false;
let processed = 0;

const ensureCanvas = () => {
    if (!canvas) {
        const targetWidth = Math.max(1, Math.floor(width * quality)) || 1;
        const targetHeight = Math.max(1, Math.floor(height * quality)) || 1;
        canvas = new OffscreenCanvas(targetWidth, targetHeight);
    }
    return canvas;
};

const sendMessage = (message: WorkerMessage) => ctx.postMessage(message);

ctx.onmessage = async (event: MessageEvent<WorkerCommand>) => {
    const data = event.data;
    if (!data) return;

    if (data.type === 'cancel') {
        cancelled = true;
        canvas = null;
        return;
    }

    try {
        switch (data.type) {
            case 'start': {
                width = data.width;
                height = data.height;
                quality = data.quality;
                cancelled = false;
                processed = 0;
                ensureCanvas();
                break;
            }
            case 'frame': {
                if (cancelled) {
                    data.bitmap.close();
                    return;
                }
                const targetCanvas = ensureCanvas();
                const context = targetCanvas.getContext('2d', { alpha: false });
                if (!context) {
                    data.bitmap.close();
                    sendMessage({ type: 'error', message: 'Unable to create 2D context in worker.' });
                    return;
                }
                context.drawImage(data.bitmap, 0, 0, targetCanvas.width, targetCanvas.height);
                data.bitmap.close();
                const scaled = targetCanvas.transferToImageBitmap();
                sendMessage({ type: 'frame', bitmap: scaled, timestamp: data.timestamp });
                processed += 1;
                sendMessage({ type: 'progress', processed });
                break;
            }
            case 'finish': {
                sendMessage({ type: 'complete' });
                break;
            }
            default:
                break;
        }
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        sendMessage({ type: 'error', message: error });
    }
};
