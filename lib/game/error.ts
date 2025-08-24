import { sendTelemetry } from './telemetry';

export function handleError(error: unknown, context?: string) {
  console.error(context ?? 'Error', error);
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  sendTelemetry({ name: 'error', data: { message, stack, context } });
}
