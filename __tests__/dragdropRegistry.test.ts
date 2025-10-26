import { dragDropRegistry } from '../src/system/dragdrop';

const itemsPayload = { items: ['alpha', 'bravo'] };

describe('DragDropRegistry', () => {
  afterEach(() => {
    dragDropRegistry.reset();
  });

  it('notifies source and target when dropping across windows', async () => {
    const sourceEvents: string[] = [];
    const targetEvents: string[] = [];

    dragDropRegistry.registerSource({
      windowId: 'window-a',
      callbacks: {
        onDropComplete: (_session, result, context) => {
          sourceEvents.push(`${result?.operation}:${context.target.windowId}`);
        },
      },
    });

    dragDropRegistry.registerTarget({
      id: 'target-b',
      windowId: 'window-b',
      onDrop: (context) => {
        targetEvents.push(`${context.session.sourceWindowId}:${context.target.windowId}`);
        return { operation: 'move' };
      },
    });

    dragDropRegistry.beginDrag({ sourceWindowId: 'window-a', payload: itemsPayload });
    await dragDropRegistry.drop('target-b');

    expect(targetEvents).toEqual(['window-a:window-b']);
    expect(sourceEvents).toEqual(['move:window-b']);
    expect(dragDropRegistry.getActiveSession()).toBeUndefined();
  });

  it('tracks hover state and accepts modifier updates', () => {
    const events: string[] = [];

    dragDropRegistry.registerSource({ windowId: 'window-a' });

    dragDropRegistry.registerTarget({
      id: 'target-a',
      windowId: 'window-b',
      onDragEnter: (context) => {
        events.push(`enter:${context.modifiers.ctrlKey ? 'ctrl' : 'none'}`);
      },
      onDragLeave: (context) => {
        events.push(`leave:${context.modifiers.ctrlKey ? 'ctrl' : 'none'}`);
      },
      onDrop: () => ({ operation: 'move' }),
    });

    dragDropRegistry.beginDrag({ sourceWindowId: 'window-a', payload: itemsPayload });

    expect(dragDropRegistry.setHoverTarget('target-a', { ctrlKey: true })).toBe(true);
    expect(dragDropRegistry.setHoverTarget('target-a', { ctrlKey: false })).toBe(true);
    dragDropRegistry.cancelDrag({ ctrlKey: true });

    expect(events).toEqual(['enter:ctrl', 'leave:ctrl']);
  });

  it('calls cancel handler when cancelled without drop', () => {
    const cancelEvents: string[] = [];

    dragDropRegistry.registerSource({
      windowId: 'window-x',
      callbacks: {
        onDragCancel: () => cancelEvents.push('cancelled'),
      },
    });

    dragDropRegistry.beginDrag({ sourceWindowId: 'window-x', payload: itemsPayload });
    dragDropRegistry.cancelDrag();

    expect(cancelEvents).toEqual(['cancelled']);
    expect(dragDropRegistry.getActiveSession()).toBeUndefined();
  });
});
