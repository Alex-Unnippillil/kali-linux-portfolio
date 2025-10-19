let pendingAnnouncement: number | null = null;

export function announcePolite(message: string): void {
  if (typeof document === 'undefined') return;
  const region = document.getElementById('live-region');
  if (!region) return;

  if (pendingAnnouncement !== null) {
    window.clearTimeout(pendingAnnouncement);
    pendingAnnouncement = null;
  }

  region.textContent = '';
  pendingAnnouncement = window.setTimeout(() => {
    region.textContent = message;
    pendingAnnouncement = null;
  }, 100);
}
