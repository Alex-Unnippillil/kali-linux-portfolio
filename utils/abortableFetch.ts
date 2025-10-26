import { createCancelScope, type CancelScope, type CancelDetail } from './cancel';

export interface AbortableFetchOptions extends RequestInit {
  cancel?: CancelScope;
  scope?: string;
  meta?: Record<string, unknown>;
  cancelDetail?: CancelDetail | unknown;
}

export interface AbortableFetchResult {
  cancel: CancelScope;
  abort: CancelScope['abort'];
  signal: AbortSignal;
  promise: Promise<Response>;
}

export function abortableFetch(
  input: RequestInfo | URL,
  init: AbortableFetchOptions = {},
): AbortableFetchResult {
  const {
    cancel,
    scope = 'fetch',
    meta,
    cancelDetail,
    signal,
    ...rest
  } = init;
  const cancelScope = cancel ?? createCancelScope(scope, { meta });
  if (signal && signal !== cancelScope.signal) {
    cancelScope.follow(signal, cancelDetail);
  }
  const promise = fetch(input, {
    ...rest,
    signal: cancelScope.signal,
  });
  return {
    cancel: cancelScope,
    abort: cancelScope.abort,
    signal: cancelScope.signal,
    promise,
  };
}

export default abortableFetch;
