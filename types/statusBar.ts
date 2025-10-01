export type StatusBarModuleId = 'mode' | 'tips' | 'network' | 'clock';

export type StatusBarRegion = 'left' | 'center' | 'right';

export type StatusBarLayout = Record<StatusBarRegion, StatusBarModuleId[]>;

export type StatusBarVisibility = Record<StatusBarModuleId, boolean>;
