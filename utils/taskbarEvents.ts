export const TASKBAR_PROGRESS_EVENT = 'taskbar-progress';
export const TASKBAR_PROGRESS_STATES = ['normal', 'paused', 'error', 'complete'] as const;

export type TaskbarProgressState = (typeof TASKBAR_PROGRESS_STATES)[number];

export type TaskbarProgressDetail = {
    appId: string;
    badgeCount?: number | null;
    badgeLabel?: string;
    progress?: {
        value: number;
        label?: string;
        status?: TaskbarProgressState;
    } | null;
    reset?: boolean;
};

export const emitTaskbarEvent = (detail: TaskbarProgressDetail) => {
    if (typeof window === 'undefined') {
        return;
    }
    window.dispatchEvent(new CustomEvent(TASKBAR_PROGRESS_EVENT, { detail }));
};

export const emitTaskbarProgress = (
    appId: string,
    progress: TaskbarProgressDetail['progress'],
    extras?: Pick<TaskbarProgressDetail, 'badgeCount' | 'badgeLabel'>,
) => {
    emitTaskbarEvent({ appId, progress, ...extras });
};

export const clearTaskbarProgress = (appId: string) => {
    emitTaskbarEvent({ appId, reset: true });
};
