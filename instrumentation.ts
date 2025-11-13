const globalForInstrumentation = globalThis as typeof globalThis & {
  __kaliInstrumentationRegistered?: boolean;
};

export async function register() {
  if (globalForInstrumentation.__kaliInstrumentationRegistered) {
    return;
  }

  globalForInstrumentation.__kaliInstrumentationRegistered = true;

  const environment = process.env.NODE_ENV ?? 'development';
  const runtime = process.env.NEXT_RUNTIME ?? 'unknown';

  // eslint-disable-next-line no-console
  console.log(
    `[instrumentation] Initializing global telemetry hooks for ${runtime} runtime in ${environment} mode.`
  );
}
