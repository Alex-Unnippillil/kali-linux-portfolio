import { track } from '@vercel/analytics/server';

export async function trackServerEvent(
  name: string,
  props?: Record<string, string | number | boolean>,
  opts?: { flags?: string[] },
) {
  try {
    await track(name, props, opts);
  } catch (err) {
    console.error(err);
  }
}
