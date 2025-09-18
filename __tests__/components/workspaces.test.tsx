import {
  deserializeWorkspace,
  serializeWorkspace,
  workspaceWindowOrder,
  workspaceWindowsToLayoutMap,
} from '../../utils/workspaces';

describe('workspace serialization helpers', () => {
  it('serializes window geometry with sanitized bounds', () => {
    const record = serializeWorkspace(
      '  Demo Lab  ',
      [
        { id: 'terminal', x: 120.5, y: 48.2, width: 108, height: -10, order: 3 },
        { id: 'notes', x: Number.NaN, y: Number.POSITIVE_INFINITY, width: 42.4, height: 77.7 },
        { id: '', x: 1, y: 2, width: 3, height: 4 },
      ],
      { id: 'ws-demo', timestamp: 1700 },
    );
    expect(record.id).toBe('ws-demo');
    expect(record.name).toBe('Demo Lab');
    expect(record.savedAt).toBe(1700);
    expect(record.windows).toHaveLength(2);
    expect(record.windows[0]).toMatchObject({ id: 'notes', x: 60, y: 10, width: 42.4, height: 77.7, order: 1 });
    expect(record.windows[1]).toMatchObject({ id: 'terminal', x: 120.5, y: 48.2, width: 100, height: 20, order: 3 });
  });

  it('deserializes stored workspaces and preserves reopen order', () => {
    const stored = {
      id: 'ws-one',
      name: 'Ops',
      savedAt: 42,
      windows: [
        { id: 'monitor', x: 10, y: 12, width: 55, height: 65, order: 2 },
        { id: 'dash', x: 80, y: 32, width: 45, height: 55, order: 1 },
        { id: '', x: 0, y: 0, width: 20, height: 20, order: 0 },
      ],
    };

    const workspace = deserializeWorkspace(stored);
    expect(workspace).not.toBeNull();
    if (!workspace) {
      return;
    }

    expect(workspace.name).toBe('Ops');
    expect(workspace.windows).toHaveLength(2);
    expect(workspace.windows.map((w) => w.id)).toEqual(['dash', 'monitor']);

    const layoutMap = workspaceWindowsToLayoutMap(workspace.windows);
    expect(layoutMap.dash).toMatchObject({ x: 80, y: 32, width: 45, height: 55, order: 1 });
    expect(layoutMap.monitor).toMatchObject({ x: 10, y: 12, width: 55, height: 65, order: 2 });

    const order = workspaceWindowOrder(workspace.windows);
    expect(order).toEqual(['dash', 'monitor']);
  });
});
