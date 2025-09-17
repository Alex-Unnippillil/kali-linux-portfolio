import {
  dragDropRegistry,
  ModifierState,
  type DropContext,
  type DragSession,
} from '../../src/system/dragdrop';
import { createOperationAnnouncement, type OperationKind } from './announcements';
import type {
  ExplorerController,
  ExplorerDestination,
  ExplorerDragPayload,
  ExplorerDropTarget,
  ExplorerItem,
  ExplorerWindowOptions,
} from './types';

export function determineOperation(modifiers: ModifierState = {}): OperationKind {
  if (modifiers.metaKey || modifiers.ctrlKey) return 'copy';
  return 'move';
}

function getDestination(target: ExplorerDropTarget, windowId: string): ExplorerDestination {
  return { path: target.path, windowId };
}

function getDestinationLabel(
  target: ExplorerDropTarget | undefined,
  context: DropContext<ExplorerDragPayload, ExplorerDropTarget>
) {
  if (target?.label) return target.label;
  if (target?.path) return target.path;
  return context.target.id;
}

function getPayload(session: DragSession<ExplorerDragPayload>): ExplorerDragPayload {
  return session.payload;
}

export function createExplorerController(options: ExplorerWindowOptions): ExplorerController {
  const { windowId, announce, operations } = options;
  const targetDisposers = new Map<string, () => void>();

  const unregisterSource = dragDropRegistry.registerSource<ExplorerDragPayload, ExplorerDropTarget>({
    windowId,
    callbacks: {
      onDropComplete: (session, result, context) => {
        if (!result || result.operation === 'none') return;
        if (!context || context.target.windowId === windowId) return;
        const payload = getPayload(session);
        const operation = (result.operation as OperationKind) ?? determineOperation(context.modifiers);
        const destinationLabel = getDestinationLabel(context.target.data, context);
        announce(
          createOperationAnnouncement({
            operation,
            items: payload.items,
            destinationLabel,
            sourceWindowId: windowId,
            targetWindowId: context.target.windowId,
            perspective: 'source',
          })
        );
      },
    },
  });

  return {
    beginDrag(items: ExplorerItem[], originPath?: string) {
      const payload: ExplorerDragPayload = { items, originPath };
      dragDropRegistry.beginDrag({ sourceWindowId: windowId, payload });
    },
    registerDropTarget(target: ExplorerDropTarget) {
      const dispose = dragDropRegistry.registerTarget<ExplorerDragPayload, ExplorerDropTarget>({
        id: target.id,
        windowId,
        data: target,
        onDrop: async (context) => {
          const payload = getPayload(context.session);
          const operation = determineOperation(context.modifiers);
          const destination = getDestination(target, windowId);
          if (operation === 'copy') {
            await operations.copy(payload.items, destination);
          } else {
            await operations.move(payload.items, destination);
          }
          const destinationLabel = getDestinationLabel(target, context);
          announce(
            createOperationAnnouncement({
              operation,
              items: payload.items,
              destinationLabel,
              sourceWindowId: context.session.sourceWindowId,
              targetWindowId: windowId,
              perspective: 'target',
            })
          );
          return {
            operation,
            targetId: target.id,
            targetWindowId: windowId,
            sourceWindowId: context.session.sourceWindowId,
          };
        },
      });
      targetDisposers.set(target.id, dispose);
      return () => {
        dispose();
        targetDisposers.delete(target.id);
      };
    },
    hoverTarget(targetId, modifiers) {
      return dragDropRegistry.setHoverTarget(targetId, modifiers);
    },
    async drop(targetId, modifiers) {
      await dragDropRegistry.drop(targetId, modifiers);
    },
    cancelDrag() {
      dragDropRegistry.cancelDrag();
    },
    dispose() {
      unregisterSource();
      for (const dispose of targetDisposers.values()) {
        dispose();
      }
      targetDisposers.clear();
    },
  };
}
