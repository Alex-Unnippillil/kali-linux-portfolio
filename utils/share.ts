export interface ShareData {
  title?: string;
  text: string;
  url?: string;
}

export async function share(data: ShareData): Promise<void> {
  const { title, text, url } = data;
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      if (!navigator.canShare || navigator.canShare({ title, text, url })) {
        await navigator.share({ title, text, url });
        return;
      }
    }
  } catch (err) {
    // ignore and fallback
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    const fallback = [text, url].filter(Boolean).join(' ');
    try {
      await navigator.clipboard.writeText(fallback);
    } catch (e) {
      // ignore
    }
  }
}
export default share;
