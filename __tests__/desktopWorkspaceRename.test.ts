import { Desktop } from '../components/screen/desktop';

describe('Desktop workspace label persistence', () => {
  const synchronizeState = (instance: Desktop) => {
    instance.setState = ((update: any, callback?: () => void) => {
      const partial = typeof update === 'function' ? update(instance.state) : update;
      if (!partial) {
        if (typeof callback === 'function') callback();
        return;
      }
      instance.state = { ...instance.state, ...partial };
      if (typeof callback === 'function') callback();
    }) as typeof instance.setState;
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('persists renamed workspace labels across reloads', () => {
    const desktop = new Desktop({});
    synchronizeState(desktop);

    const renameEvent = new CustomEvent('workspace-rename', {
      detail: { workspaceId: 0, label: 'Threat Ops' },
    });

    desktop.handleExternalWorkspaceRename(renameEvent);

    expect(desktop.state.workspaces[0].label).toBe('Threat Ops');

    const stored = localStorage.getItem('workspace_labels');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toEqual(expect.objectContaining({ 0: 'Threat Ops' }));

    const rehydrated = new Desktop({});
    synchronizeState(rehydrated);
    rehydrated.restoreWorkspaceLabels();

    expect(rehydrated.state.workspaces[0].label).toBe('Threat Ops');
  });

  it('ignores empty rename submissions', () => {
    const desktop = new Desktop({});
    synchronizeState(desktop);

    const renameEvent = new CustomEvent('workspace-rename', {
      detail: { workspaceId: 0, label: '   ' },
    });

    desktop.handleExternalWorkspaceRename(renameEvent);

    expect(desktop.state.workspaces[0].label).toBe('Workspace 1');
    expect(localStorage.getItem('workspace_labels')).toBeNull();
  });
});
