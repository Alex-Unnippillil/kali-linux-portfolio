export { diffText, myersDiff } from './textDiff';
export { diffJson, isDeepEqual, isObjectLike } from './jsonDiff';
export { diffArray } from './arrayDiff';
export type {
  DiffSegment,
  DiffSegmentType,
  JsonDiffEntry,
  JsonDiffKind,
  DiffResult,
  DiffMode,
  TextDiffResult,
  StructuredDiffResult,
  TextDiffPayload,
  JsonDiffPayload,
  ArrayDiffPayload,
  DiffWorkerRequestMessage,
  DiffWorkerResponseMessage,
} from './types';
export { DiffWorkerPool, getDiffWorkerPool, runDiff } from './workerPool';
