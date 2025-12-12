export type DiffSegmentType = 'equal' | 'insert' | 'delete';

export interface DiffSegment {
  type: DiffSegmentType;
  text: string;
}

export type JsonDiffKind = 'added' | 'removed' | 'changed' | 'unchanged';

export interface JsonDiffEntry {
  path: Array<string | number>;
  kind: JsonDiffKind;
  before?: unknown;
  after?: unknown;
}

export type DiffMode = 'text' | 'json' | 'array';

export interface TextDiffResult {
  kind: 'text';
  segments: DiffSegment[];
}

export interface StructuredDiffResult {
  kind: 'json' | 'array';
  changes: JsonDiffEntry[];
}

export type DiffResult = TextDiffResult | StructuredDiffResult;

export interface TextDiffPayload {
  left: string;
  right: string;
}

export interface JsonDiffPayload {
  left: unknown;
  right: unknown;
}

export interface ArrayDiffPayload {
  left: unknown[];
  right: unknown[];
}

export type DiffPayloadMap = {
  text: TextDiffPayload;
  json: JsonDiffPayload;
  array: ArrayDiffPayload;
};

export type DiffWorkerRequestMessage =
  | {
      type: 'diff';
      id: string;
      mode: DiffMode;
      payload: DiffPayloadMap[DiffMode];
    }
  | { type: 'cancel'; id: string };

export type DiffWorkerResponseMessage =
  | { id: string; status: 'success'; mode: DiffMode; result: DiffResult }
  | { id: string; status: 'error'; error: string }
  | { id: string; status: 'cancelled' };
