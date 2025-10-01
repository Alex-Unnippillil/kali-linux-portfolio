export type QuickActionId =
  | 'new-tab'
  | 'record-screen'
  | 'open-settings'
  | 'lock-screen';

export interface QuickActionConfig {
  id: QuickActionId;
  visible: boolean;
}
