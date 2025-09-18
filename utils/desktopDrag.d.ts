export type DesktopFileDrag = {
  type: 'file';
  name: string;
  getFile: () => Promise<File>;
  label?: string;
};

export type DesktopAppDrag = {
  type: 'app';
  appId: string;
  title: string;
  label?: string;
};

export type DesktopDragPayload = DesktopFileDrag | DesktopAppDrag;

export type BeginDesktopDragOptions = {
  ttl?: number;
  effectAllowed?: DataTransfer['effectAllowed'];
};

export function beginDesktopDrag(
  event: Pick<DragEvent, 'dataTransfer'>,
  payload: DesktopDragPayload,
  options?: BeginDesktopDragOptions,
): string | null;

export function endDesktopDrag(id: string | null | undefined): void;

export function peekDesktopDrag(
  dataTransfer: DataTransfer | null,
): DesktopDragPayload | null;

export function consumeDesktopDrag(
  dataTransfer: DataTransfer | null,
): DesktopDragPayload | null;

export function isDesktopDragEvent(dataTransfer: DataTransfer | null): boolean;

declare const desktopDragInternal: {
  _store: Map<string, { payload: DesktopDragPayload; expires: number }>;
  _mime: string;
};

export { desktopDragInternal };
