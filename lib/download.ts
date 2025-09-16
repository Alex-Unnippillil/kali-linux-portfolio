export function downloadBlob(name: string, blob: Blob): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;

  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}
