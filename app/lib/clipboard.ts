export async function copy(text: string): Promise<void> {
  if (typeof navigator === 'undefined') {
    return;
  }

  const { clipboard } = navigator;
  if (!clipboard || typeof clipboard.writeText !== 'function') {
    return;
  }

  try {
    await clipboard.writeText(text);
  } catch {
    // Swallow clipboard errors to avoid crashing callers when the API is unavailable.
  }
}

export default copy;
