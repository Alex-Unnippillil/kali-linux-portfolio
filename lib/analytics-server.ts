export default async function trackServerEvent(
  event: string,
  properties?: Record<string, any>,
  options?: Record<string, any>,
): Promise<void> {
  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'true') return;
  try {
    const mod = await import('@vercel/analytics/server');
    await mod.track(event, properties, options);
  } catch {
    // ignore analytics errors
  }
}
