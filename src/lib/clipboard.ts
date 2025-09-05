export function stripFormatting(html: string): string {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

export async function pastePlainText(): Promise<string> {
  try {
    if (navigator.clipboard && (navigator.clipboard as any).read) {
      const items = await (navigator.clipboard as any).read();
      for (const item of items) {
        if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          return await blob.text();
        }
        if (item.types.includes('text/html')) {
          const blob = await item.getType('text/html');
          const html = await blob.text();
          return stripFormatting(html);
        }
      }
    }
    const text = await navigator.clipboard.readText();
    return stripFormatting(text);
  } catch {
    return '';
  }
}

export default pastePlainText;
