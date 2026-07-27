import { serverOnly } from './server/server-only';

serverOnly('lib/analytics-server');

export default async function trackServerEvent(
  event: string,
  properties?: Record<string, any>,
  options?: Record<string, any>
): Promise<void> {
  try {
    const mod = await import('@vercel/analytics/server');
    await mod.track(event, properties, options);
  } catch {
    // ignore analytics errors

  }
}
