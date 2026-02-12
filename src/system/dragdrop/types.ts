export type ModifierState = {
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
};

export interface DragSession<TPayload = unknown> {
  id: string;
  sourceWindowId: string;
  payload: TPayload;
}

export interface SourceCallbacks<TPayload = unknown, TData = unknown> {
  onDragStart?: (session: DragSession<TPayload>) => void;
  onDragEnd?: (session: DragSession<TPayload>) => void;
  onDropComplete?: (
    session: DragSession<TPayload>,
    result: DropResult | undefined,
    context: DropContext<TPayload, TData>
  ) => void;
  onDragCancel?: (session: DragSession<TPayload>) => void;
}

export interface DragSource<TPayload = unknown, TData = unknown> {
  windowId: string;
  callbacks?: SourceCallbacks<TPayload, TData>;
}

export interface DropResult {
  operation: string;
  [key: string]: unknown;
}

export interface DropContext<TPayload = unknown, TData = unknown> {
  session: DragSession<TPayload>;
  target: {
    id: string;
    windowId: string;
    data?: TData;
  };
  modifiers: ModifierState;
}

export interface DragTarget<TPayload = unknown, TData = unknown> {
  id: string;
  windowId: string;
  data?: TData;
  accepts?: (session: DragSession<TPayload>) => boolean;
  onDragEnter?: (context: DropContext<TPayload, TData>) => void;
  onDragLeave?: (context: DropContext<TPayload, TData>) => void;
  onDrop: (
    context: DropContext<TPayload, TData>
  ) => Promise<DropResult | void> | DropResult | void;
}
