export type PermissionType =
  | 'clipboard-read'
  | 'clipboard-write'
  | 'bluetooth'
  | 'notifications';

export type PermissionDecision = 'granted' | 'denied';

export interface PermissionPreference {
  decision: PermissionDecision;
  remember: boolean;
  updatedAt: number;
  snoozedUntil?: number;
}

export interface PermissionPromptReason {
  title: string;
  description: string;
}
