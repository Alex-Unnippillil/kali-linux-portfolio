import { resolveDropZones } from '../modules/dragContext';

describe('dragContext drop zone metadata', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="desktop">
        <div id="window-area">
          <div class="opened-window" id="window-terminal"></div>
        </div>
        <div id="taskbar"></div>
      </main>
    `;

    const baseRect = {
      left: 10,
      top: 20,
      right: 210,
      bottom: 120,
      width: 200,
      height: 100,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    } as DOMRect;

    const withOffset = (offset: number) => ({
      ...baseRect,
      top: baseRect.top + offset,
      bottom: baseRect.bottom + offset,
      y: baseRect.y + offset,
    });

    const desktop = document.getElementById('desktop') as HTMLElement;
    const taskbar = document.getElementById('taskbar') as HTMLElement;
    const windowEl = document.getElementById('window-terminal') as HTMLElement;

    if (desktop) {
      desktop.getBoundingClientRect = () => withOffset(0);
    }
    if (taskbar) {
      taskbar.getBoundingClientRect = () => withOffset(140);
    }
    if (windowEl) {
      windowEl.getBoundingClientRect = () => withOffset(70);
    }
  });

  it('resolves desktop, taskbar, and window zones with labels', () => {
    const zones = resolveDropZones('app-shortcut');
    const labels = zones.map((zone) => zone.zone.label);
    expect(labels).toContain('Move');
    expect(labels).toContain('Pin to taskbar');
    expect(labels).toContain('Open with');

    const windowTargets = zones.filter((zone) => zone.zone.id === 'window');
    expect(windowTargets).toHaveLength(1);
    expect(windowTargets[0].data?.targetId).toBe('window-terminal');
  });
});
