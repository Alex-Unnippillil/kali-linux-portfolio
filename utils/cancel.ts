export interface CancelReason {
  scope: string[];
  message?: string;
  cause?: unknown;
  meta: Record<string, unknown>;
}

export interface CancelDetail {
  message?: string;
  cause?: unknown;
  meta?: Record<string, unknown>;
}

export interface CancelScope {
  readonly signal: AbortSignal;
  readonly scope: string[];
  readonly meta: Record<string, unknown>;
  readonly reason: CancelReason | undefined;
  abort(detail?: CancelDetail | CancelReason | unknown): CancelReason;
  child(scope: string, meta?: Record<string, unknown>): CancelScope;
  follow(signal: AbortSignal, detail?: CancelDetail | CancelReason | unknown): void;
  onAbort(handler: (reason: CancelReason) => void): () => void;
  dispose(): void;
}

export interface CancelScopeOptions {
  parent?: CancelScope | AbortSignal | null;
  meta?: Record<string, unknown>;
}

function isCancelScope(value: unknown): value is CancelScope {
  return (
    !!value &&
    typeof value === 'object' &&
    'signal' in value &&
    value !== null &&
    (value as CancelScope).signal instanceof AbortSignal
  );
}

function toSignal(parent?: CancelScope | AbortSignal | null): AbortSignal | null {
  if (!parent) return null;
  if (isCancelScope(parent)) return parent.signal;
  if (parent instanceof AbortSignal) return parent;
  return null;
}

function toScope(parent?: CancelScope | AbortSignal | null): CancelScope | null {
  if (!parent) return null;
  return isCancelScope(parent) ? parent : null;
}

function toMeta(parent?: CancelScope | AbortSignal | null): Record<string, unknown> {
  return isCancelScope(parent) ? parent.meta : {};
}

function isCancelReason(value: unknown): value is CancelReason {
  return !!value && typeof value === 'object' && Array.isArray((value as CancelReason).scope);
}

function isCancelDetail(value: unknown): value is CancelDetail {
  return !!value && typeof value === 'object' && !Array.isArray((value as any).scope);
}

function reasonFrom(
  path: string[],
  aggregateMeta: Record<string, unknown>,
  input?: CancelDetail | CancelReason | unknown,
): CancelReason {
  if (isCancelReason(input)) {
    return {
      scope: path,
      message: input.message,
      cause: input.cause,
      meta: {
        ...aggregateMeta,
        ...(input.meta ?? {}),
      },
    };
  }

  if (isCancelDetail(input)) {
    return {
      scope: path,
      message: input.message,
      cause: input.cause,
      meta: {
        ...aggregateMeta,
        ...(input.meta ?? {}),
      },
    };
  }

  if (input instanceof Error) {
    return {
      scope: path,
      message: input.message,
      cause: input,
      meta: { ...aggregateMeta },
    };
  }

  if (input !== undefined) {
    return {
      scope: path,
      cause: input,
      meta: { ...aggregateMeta },
    };
  }

  return {
    scope: path,
    meta: { ...aggregateMeta },
  };
}

export function createCancelScope(
  scope: string,
  options: CancelScopeOptions = {},
): CancelScope {
  const controller = new AbortController();
  const parentScope = toScope(options.parent);
  const parentSignal = toSignal(options.parent);
  const aggregateMeta = {
    ...toMeta(options.parent),
    ...(options.meta ?? {}),
  };
  const scopePath = [...(parentScope?.scope ?? []), scope];
  let reason: CancelReason | undefined;
  const cleanupFns = new Set<() => void>();
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    for (const fn of Array.from(cleanupFns)) {
      try {
        fn();
      } catch {
        /* ignore */
      }
    }
    cleanupFns.clear();
  };

  const abortWith = (input?: CancelDetail | CancelReason | unknown): CancelReason => {
    if (controller.signal.aborted) return reason ?? reasonFrom(scopePath, aggregateMeta, input);
    const next = reasonFrom(scopePath, aggregateMeta, input);
    reason = next;
    cleanup();
    controller.abort(next);
    return next;
  };

  const follow = (
    signal: AbortSignal,
    detail?: CancelDetail | CancelReason | unknown,
  ) => {
    if (!signal || signal === controller.signal) return;
    const propagate = () => {
      const externalReason = (signal as any).reason;
      abortWith(externalReason ?? detail);
    };
    if (signal.aborted) {
      propagate();
      return;
    }
    signal.addEventListener('abort', propagate, { once: true });
    const remove = () => {
      signal.removeEventListener('abort', propagate);
      cleanupFns.delete(remove);
    };
    cleanupFns.add(remove);
  };

  if (parentSignal) {
    const parentAbort = () => {
      const parentReason = (parentSignal as any).reason as CancelReason | undefined;
      abortWith(parentReason ?? undefined);
    };
    if (parentSignal.aborted) {
      parentAbort();
    } else {
      parentSignal.addEventListener('abort', parentAbort, { once: true });
      const removeParent = () => {
        parentSignal.removeEventListener('abort', parentAbort);
        cleanupFns.delete(removeParent);
      };
      cleanupFns.add(removeParent);
    }
  }

  const cancelScope: CancelScope = {
    get signal() {
      return controller.signal;
    },
    get scope() {
      return scopePath;
    },
    get meta() {
      return aggregateMeta;
    },
    get reason() {
      return reason;
    },
    abort: abortWith,
    child(childScope: string, childMeta?: Record<string, unknown>) {
      return createCancelScope(childScope, {
        parent: cancelScope,
        meta: childMeta,
      });
    },
    follow,
    onAbort(handler: (value: CancelReason) => void) {
      if (controller.signal.aborted) {
        handler(reason ?? reasonFrom(scopePath, aggregateMeta));
        return () => {};
      }
      const listener = () => {
        handler(reason ?? reasonFrom(scopePath, aggregateMeta));
      };
      controller.signal.addEventListener('abort', listener, { once: true });
      const remove = () => {
        controller.signal.removeEventListener('abort', listener);
        cleanupFns.delete(remove);
      };
      cleanupFns.add(remove);
      return remove;
    },
    dispose() {
      cleanup();
    },
  };

  return cancelScope;
}

export default createCancelScope;
