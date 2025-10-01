export type SnapArea =
  | 'half-left'
  | 'half-right'
  | 'third-left'
  | 'third-center'
  | 'third-right'
  | 'quarter-top-left'
  | 'quarter-top-right'
  | 'quarter-bottom-left'
  | 'quarter-bottom-right';

export type WindowLayoutMap = Record<string, SnapArea>;
