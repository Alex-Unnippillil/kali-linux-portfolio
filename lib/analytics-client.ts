export const trackEvent = async (
  name: string,
  properties?: Record<string, string | number | boolean | null>,
): Promise<void> => {
  try {
    const { track } = await import("@vercel/analytics");
    track(name, properties);
  } catch {
    // ignore analytics errors
  }
};

export default trackEvent;
