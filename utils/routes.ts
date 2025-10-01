export const APP_ROUTE_PREFIX = '/apps';

export type ValidAppId<Id extends string> = Id extends ''
  ? never
  : Id extends `/${string}`
    ? never
    : Id;

export type AppRoute<Id extends string = string> = `${typeof APP_ROUTE_PREFIX}/${Id}`;

export type AppRouteParams<Id extends string = string> = {
  appId: ValidAppId<Id>;
};

const normalizeAppId = (appId: string): string => {
  const trimmed = appId.trim();

  if (!trimmed) {
    throw new Error('App id must be a non-empty string.');
  }

  if (trimmed.startsWith('/')) {
    throw new Error('App id must not start with a forward slash.');
  }

  return trimmed;
};

export const buildAppRoute = <Id extends string>(
  params: AppRouteParams<Id>,
): AppRoute<ValidAppId<Id>> => {
  const normalized = normalizeAppId(params.appId);
  return `${APP_ROUTE_PREFIX}/${normalized}` as AppRoute<ValidAppId<Id>>;
};

export type ParseAppRouteResult<Id extends string = string> = {
  appId: ValidAppId<Id>;
};

const stripQueryAndHash = (path: string): string => {
  const queryIndex = path.indexOf('?');
  const hashIndex = path.indexOf('#');

  if (queryIndex === -1 && hashIndex === -1) {
    return path;
  }

  const endIndex = [queryIndex, hashIndex]
    .filter((index) => index >= 0)
    .reduce((min, index) => Math.min(min, index), Number.POSITIVE_INFINITY);

  return path.slice(0, Number.isFinite(endIndex) ? endIndex : undefined);
};

export const parseAppRoute = <Id extends string>(
  input: string,
): ParseAppRouteResult<Id> | null => {
  if (typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  if (!normalized.startsWith(`${APP_ROUTE_PREFIX}/`)) {
    return null;
  }

  const withoutPrefix = stripQueryAndHash(normalized.slice(APP_ROUTE_PREFIX.length + 1));
  if (!withoutPrefix) {
    return null;
  }

  const appId = withoutPrefix.replace(/\/+$/, '');
  if (!appId) {
    return null;
  }

  try {
    return { appId: normalizeAppId(appId) } as ParseAppRouteResult<Id>;
  } catch {
    return null;
  }
};

export const isAppRoute = <Id extends string>(value: string): value is AppRoute<Id> => {
  return parseAppRoute<Id>(value) !== null;
};
