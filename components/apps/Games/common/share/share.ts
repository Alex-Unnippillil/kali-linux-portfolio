import { guardTextDownload } from '../../../../../utils/redact';

const TEXTUAL_MIME = /^(text\/|application\/(?:json|xml|csv|x-yaml|javascript))/i;

const shouldScanBlob = (blob: Blob): boolean => {
  if (!blob.type) return blob.size <= 512 * 1024; // assume small unknown blobs are textual
  return TEXTUAL_MIME.test(blob.type);
};

export async function shareBlob(blob: Blob, fileName: string): Promise<void> {
  let workingBlob = blob;

  if (shouldScanBlob(blob)) {
    const text = await blob.text();
    const decision = guardTextDownload(text, { filename: fileName });
    if (decision.aborted) return;
    workingBlob = new Blob([decision.content], { type: blob.type || 'text/plain' });
  }

  const file = new File([workingBlob], fileName, { type: workingBlob.type });
  const shareData: ShareData = { files: [file] };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      return;
    } catch {
      // fall back to download if sharing fails
    }
  }

  const url = URL.createObjectURL(workingBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
