import type { ExplorerItem } from './types';

export type OperationKind = 'copy' | 'move';
export type AnnouncementPerspective = 'target' | 'source';

export interface OperationAnnouncementOptions {
  operation: OperationKind;
  items: ExplorerItem[];
  destinationLabel: string;
  sourceWindowId: string;
  targetWindowId: string;
  perspective?: AnnouncementPerspective;
}

function formatItemSummary(items: ExplorerItem[]) {
  if (!items.length) return 'items';
  if (items.length === 1) return items[0].name;
  return `${items.length} items`;
}

export function createOperationAnnouncement({
  operation,
  items,
  destinationLabel,
  sourceWindowId,
  targetWindowId,
  perspective = 'target',
}: OperationAnnouncementOptions) {
  const verb = operation === 'copy' ? 'Copied' : 'Moved';
  const summary = formatItemSummary(items);

  if (perspective === 'target') {
    const fromWindow = sourceWindowId !== targetWindowId ? ` from ${sourceWindowId}` : '';
    return `${verb} ${summary} into ${destinationLabel}${fromWindow}.`;
  }

  const inWindow = sourceWindowId !== targetWindowId ? ` in ${targetWindowId}` : '';
  return `${verb} ${summary} to ${destinationLabel}${inWindow}.`;
}
