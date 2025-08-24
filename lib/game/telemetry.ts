interface TelemetryEvent {
  name: string;
  data?: Record<string, unknown>;
}

export function sendTelemetry(event: TelemetryEvent) {
  const body = JSON.stringify(event);
  try {
    navigator.sendBeacon('/api/telemetry', body);
  } catch {
    fetch('/api/telemetry', {
      method: 'POST',
      body,
      keepalive: true,
    }).catch(() => {
      /* ignore */
    });
  }
}
