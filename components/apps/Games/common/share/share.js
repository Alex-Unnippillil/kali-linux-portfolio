export async function shareBlob(blob, fileName) {
    const file = new File([blob], fileName, { type: blob.type });
    const shareData = { files: [file] };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
            await navigator.share(shareData);
            return;
        }
        catch {
            // fall back to download if sharing fails
        }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
