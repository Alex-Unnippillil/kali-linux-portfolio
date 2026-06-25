import { dragDropRegistry } from '../src/system/dragdrop';
import {
  createExplorerController,
  createOperationAnnouncement,
  determineOperation,
  type ExplorerItem,
} from '../apps/files';

describe('File explorer drag and drop', () => {
  afterEach(() => {
    dragDropRegistry.reset();
  });

  const sampleItem: ExplorerItem = {
    id: '1',
    name: 'notes.txt',
    path: '/src/notes.txt',
    kind: 'file',
  };

  it('determines copy operation when modifier is pressed', () => {
    expect(determineOperation()).toBe('move');
    expect(determineOperation({ ctrlKey: true })).toBe('copy');
    expect(determineOperation({ metaKey: true })).toBe('copy');
    expect(determineOperation({ shiftKey: true })).toBe('move');
  });

  it('builds announcements with correct perspective', () => {
    const targetMessage = createOperationAnnouncement({
      operation: 'move',
      items: [sampleItem],
      destinationLabel: 'Documents',
      sourceWindowId: 'window-a',
      targetWindowId: 'window-b',
      perspective: 'target',
    });

    const sourceMessage = createOperationAnnouncement({
      operation: 'copy',
      items: [sampleItem],
      destinationLabel: 'Downloads',
      sourceWindowId: 'window-a',
      targetWindowId: 'window-b',
      perspective: 'source',
    });

    expect(targetMessage).toBe('Moved notes.txt into Documents from window-a.');
    expect(sourceMessage).toBe('Copied notes.txt to Downloads in window-b.');
  });

  it('announces cross-window copy operations and respects modifiers', async () => {
    const sourceAnnouncements: string[] = [];
    const targetAnnouncements: string[] = [];

    const sourceController = createExplorerController({
      windowId: 'window-a',
      announce: (message) => sourceAnnouncements.push(message),
      operations: {
        move: jest.fn(),
        copy: jest.fn(),
      },
    });

    const targetOperations = {
      move: jest.fn(),
      copy: jest.fn(),
    };

    const targetController = createExplorerController({
      windowId: 'window-b',
      announce: (message) => targetAnnouncements.push(message),
      operations: targetOperations,
    });

    targetController.registerDropTarget({ id: 'folder', path: '/dest', label: 'Documents' });

    sourceController.beginDrag([sampleItem], '/src');
    await targetController.drop('folder', { ctrlKey: true });

    expect(targetOperations.copy).toHaveBeenCalledWith([sampleItem], {
      path: '/dest',
      windowId: 'window-b',
    });
    expect(targetAnnouncements).toEqual(['Copied notes.txt into Documents from window-a.']);
    expect(sourceAnnouncements).toEqual(['Copied notes.txt to Documents in window-b.']);

    sourceController.dispose();
    targetController.dispose();
  });

  it('announces single-window move once', async () => {
    const announcements: string[] = [];
    const operations = {
      move: jest.fn(),
      copy: jest.fn(),
    };

    const controller = createExplorerController({
      windowId: 'window-a',
      announce: (message) => announcements.push(message),
      operations,
    });

    controller.registerDropTarget({ id: 'folder', path: '/dest', label: 'Documents' });

    controller.beginDrag([sampleItem], '/src');
    await controller.drop('folder');

    expect(operations.move).toHaveBeenCalledWith([sampleItem], {
      path: '/dest',
      windowId: 'window-a',
    });
    expect(announcements).toEqual(['Moved notes.txt into Documents.']);

    controller.dispose();
  });
});
