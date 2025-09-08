import { getDoNotDisturb } from './notificationSettings';

/**
 * Simple on-screen display (OSD) service for showing transient messages.
 * Messages are suppressed when Do Not Disturb is enabled.
 */
class OSDService {
  private el: HTMLDivElement | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Show an OSD message for the given duration in milliseconds.
   */
  show(message: string, duration = 1200): void {
    if (getDoNotDisturb()) return;
    if (typeof document === 'undefined') return;

    if (!this.el) {
      this.el = document.createElement('div');
      this.el.dataset.osd = 'true';
      this.el.setAttribute('role', 'status');
      this.el.setAttribute('aria-live', 'polite');
      this.el.setAttribute('aria-label', 'Notification');
      Object.assign(this.el.style, {
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 12px',
        background: 'var(--toast-bg)',
        color: 'var(--toast-text)',
        border: '1px solid var(--toast-border)',
        borderRadius: 'var(--radius-md)',
        zIndex: '9999',
      });
      document.body.appendChild(this.el);
    }

    this.el.textContent = message;

    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.el?.remove();
      this.el = null;
    }, duration);
  }
}

const osdService = new OSDService();
export default osdService;
