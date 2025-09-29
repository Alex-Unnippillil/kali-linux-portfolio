export const RESOURCE_MONITOR_ENV_FLAG = 'NEXT_PUBLIC_ENABLE_RESOURCE_MONITOR';

const isExplicitFlagEnabled =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_ENABLE_RESOURCE_MONITOR === 'true';

export const isResourceMonitorEnabled =
  process.env.NODE_ENV !== 'production' || isExplicitFlagEnabled;
