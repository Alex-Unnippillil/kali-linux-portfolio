export type DesktopWindow = { id: string; isMinimized?: boolean; isFocused?: boolean };
export type DesktopSnapshot = { activeWorkspace: number; runningApps: DesktopWindow[] };
export type DesktopCommand = { appId: string; action: 'minimize' | 'open' };
export type ShowDesktopView = Readonly<{ showing: boolean; busy: boolean; available: boolean }>;
const EMPTY: ShowDesktopView = Object.freeze({ showing: false, busy: false, available: false });

/** Coordinates existing window-manager commands; never owns or mutates window state.
 * Restore commands are acknowledged one at a time because the manager also saves
 * positions and session state. A closed window is never reopened by Restore windows.
 */
export function createShowDesktopController(send: (command: DesktopCommand) => void) {
  let latest: DesktopSnapshot = { activeWorkspace: 0, runningApps: [] };
  const saved = new Map<number, string[]>();
  const listeners = new Set<() => void>();
  let view = EMPTY;
  let operation: { workspace: number; queue: DesktopCommand[]; current?: DesktopCommand } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let sending = false;
  const publish = () => {
    const ids = saved.get(latest.activeWorkspace) || [];
    const showing = ids.some((id) => latest.runningApps.some((app) => app.id === id && app.isMinimized));
    const next = { showing, busy: !!operation, available: showing || latest.runningApps.some((app) => !app.isMinimized) };
    if (next.showing !== view.showing || next.busy !== view.busy || next.available !== view.available) {
      view = next;
      listeners.forEach((listener) => listener());
    }
  };
  const clearTimer = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  const satisfied = (command: DesktopCommand) => {
    const app = latest.runningApps.find((item) => item.id === command.appId);
    return !app || !!app.isMinimized === (command.action === 'minimize');
  };
  const pump = () => {
    if (sending || !operation) return;
    if (operation.workspace !== latest.activeWorkspace) {
      clearTimer(); operation = undefined; publish(); return;
    }
    if (operation.current && !satisfied(operation.current)) return;
    clearTimer();
    operation.current = undefined;
    while (operation.queue.length) {
      const command = operation.queue.shift()!;
      if (satisfied(command)) continue;
      operation.current = command;
      // Recover a responsive control if an app disappears or a manager cannot respond.
      timer = setTimeout(() => { operation = undefined; timer = undefined; publish(); }, 3000);
      sending = true;
      try { send(command); } finally { sending = false; }
      if (operation?.current && satisfied(operation.current)) pump();
      return;
    }
    operation = undefined;
    publish();
  };
  return {
    getSnapshot: () => view,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    update(next: DesktopSnapshot) {
      latest = next;
      const ids = saved.get(next.activeWorkspace);
      if (ids) {
        const remaining = ids.filter((id) => next.runningApps.some((app) => app.id === id));
        if (remaining.length) saved.set(next.activeWorkspace, remaining);
        else saved.delete(next.activeWorkspace);
      }
      pump(); publish();
    },
    toggle() {
      if (operation || !view.available) return;
      const workspace = latest.activeWorkspace;
      let queue: DesktopCommand[];
      if (view.showing) {
        queue = (saved.get(workspace) || []).map((appId) => ({ appId, action: 'open' }));
      } else {
        const visible = latest.runningApps.filter((app) => !app.isMinimized);
        // Preserve the previously focused window by restoring it last.
        const ids = [...visible.filter((app) => !app.isFocused), ...visible.filter((app) => app.isFocused)].map((app) => app.id);
        saved.set(workspace, ids);
        queue = ids.map((appId) => ({ appId, action: 'minimize' }));
      }
      operation = { workspace, queue };
      publish(); pump();
    },
    reset() { clearTimer(); operation = undefined; saved.clear(); latest = { activeWorkspace: 0, runningApps: [] }; publish(); },
  };
}
