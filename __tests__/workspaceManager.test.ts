import WorkspaceManager from '../utils/workspaceManager';

describe('WorkspaceManager', () => {
  it('clamps workspace count between 1 and 8', () => {
    const manager = new WorkspaceManager({ initialCount: 0 });
    expect(manager.getWorkspaces()).toHaveLength(1);

    manager.setWorkspaceCount(20);
    expect(manager.getWorkspaces()).toHaveLength(8);

    manager.setWorkspaceCount(-5);
    expect(manager.getWorkspaces()).toHaveLength(1);
  });

  it('migrates windows when shrinking workspace count', () => {
    const manager = new WorkspaceManager({ initialCount: 4 });
    const workspaces = manager.getWorkspaces();

    manager.registerWindow('alpha', workspaces[0].id);
    manager.registerWindow('bravo', workspaces[1].id);
    manager.registerWindow('charlie', workspaces[2].id);
    manager.registerWindow('delta', workspaces[3].id);

    manager.setActiveWorkspace(workspaces[3].id);
    manager.setWorkspaceCount(2);

    const resized = manager.getWorkspaces();
    expect(resized).toHaveLength(2);

    expect(resized[0].windows).toEqual(['alpha']);
    expect(resized[1].windows).toEqual(['bravo', 'charlie', 'delta']);

    const deltaWorkspace = manager.getWorkspaceForWindow('delta');
    expect(deltaWorkspace?.id).toBe(resized[1].id);
    expect(deltaWorkspace?.name).toBe('Workspace 2');

    expect(manager.activeWorkspaceId).toBe(resized[1].id);
  });

  it('preserves unique window assignments when migrating', () => {
    const manager = new WorkspaceManager({ initialCount: 3 });
    const [first, second, third] = manager.getWorkspaces();

    manager.registerWindow('win-1', first.id);
    manager.registerWindow('win-2', second.id);
    manager.registerWindow('win-3', third.id);

    manager.moveWindow('win-1', third.id);
    expect(manager.getWorkspaceForWindow('win-1')?.id).toBe(third.id);

    manager.setWorkspaceCount(2);
    const reduced = manager.getWorkspaces();
    expect(reduced[1].windows).toEqual(['win-2', 'win-3', 'win-1']);

    const unique = new Set(reduced[1].windows);
    expect(unique.size).toBe(reduced[1].windows.length);
  });
});
