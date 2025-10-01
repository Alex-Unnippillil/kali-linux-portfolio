import type { ComponentType, JSX } from 'react';
import type { ParsedUrlQuery } from 'querystring';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { z } from 'zod';
import apps from '../apps.config';
import DeepLinkRescue from '../components/common/DeepLinkRescue';

const CURRENT_VERSION = 1;

const FALLBACK_ALIASES: Record<string, DeepLinkFallbackMode> = {
  exact: 'exact',
  none: 'exact',
  'open-closest': 'open-closest',
  openclosest: 'open-closest',
  closest: 'open-closest',
  'open_closest': 'open-closest',
};

const DeepLinkSchema = z
  .object({
    v: z.preprocess(
      (value) => {
        if (value === undefined || value === null || value === '') return CURRENT_VERSION;
        if (typeof value === 'string' && value.trim() === '') return CURRENT_VERSION;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : value;
      },
      z.number().int().min(1)
    ),
    open: z.string().min(1),
    fallback: z
      .string()
      .optional()
      .transform((value) => {
        if (!value) return 'exact';
        const normalized = value.toLowerCase().replace(/\s+/g, '-');
        return FALLBACK_ALIASES[normalized] ?? 'exact';
      }),
    ctx: z
      .string()
      .optional()
      .transform((raw, ctx) => {
        if (raw === undefined) return undefined;
        try {
          const decoded = decodeURIComponent(raw);
          const parsed = JSON.parse(decoded);
          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Deep link context must be an object',
            });
            return z.NEVER;
          }
          return parsed as Record<string, unknown>;
        } catch (error) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Deep link context payload could not be parsed',
          });
          return z.NEVER;
        }
      }),
  })
  .transform((value) => ({
    version: value.v,
    targetId: value.open,
    fallback: (value.fallback ?? 'exact') as DeepLinkFallbackMode,
    context: value.ctx,
  }));

type DeepLinkFallbackMode = 'exact' | 'open-closest';

export type DeepLinkParams = {
  version: number;
  targetId: string;
  fallback: DeepLinkFallbackMode;
  context?: Record<string, unknown>;
};

export type DeepLinkError =
  | {
      code: 'invalid';
      message: string;
      issues?: string[];
    }
  | {
      code: 'unsupported-version';
      message: string;
      received: number;
      supported: number;
    }
  | {
      code: 'not-found';
      message: string;
      target: string;
      suggestion?: string;
    }
  | {
      code: 'mismatch';
      message: string;
      expected: string;
      resolved: string;
      suggestion?: string;
    };

export type DeepLinkParseResult =
  | { kind: 'none' }
  | { kind: 'parsed'; params: DeepLinkParams }
  | { kind: 'error'; error: DeepLinkError };

const defaultAppIds = apps.map((app) => app.id);

const hasDeepLinkKeys = (query: Record<string, string>) =>
  ['open', 'v', 'fallback', 'ctx'].some((key) => key in query);

const normalizeQuery = (query: ParsedUrlQuery | URLSearchParams | string | Record<string, unknown>) => {
  if (typeof query === 'string') {
    return normalizeQuery(new URLSearchParams(query));
  }
  if (query instanceof URLSearchParams) {
    const result: Record<string, string> = {};
    query.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  const result: Record<string, string> = {};
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0) result[key] = value[0];
    } else if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
  });
  return result;
};

export const parseDeepLinkQuery = (
  query: ParsedUrlQuery | URLSearchParams | string | Record<string, unknown>
): DeepLinkParseResult => {
  const normalized = normalizeQuery(query);
  if (!hasDeepLinkKeys(normalized)) {
    return { kind: 'none' };
  }
  const parsed = DeepLinkSchema.safeParse(normalized);
  if (!parsed.success) {
    return {
      kind: 'error',
      error: {
        code: 'invalid',
        message: 'Unable to parse deep link parameters',
        issues: parsed.error.issues.map((issue) => issue.message),
      },
    };
  }
  if (parsed.data.version !== CURRENT_VERSION) {
    return {
      kind: 'error',
      error: {
        code: 'unsupported-version',
        message: `Deep link version ${parsed.data.version} is not supported`,
        received: parsed.data.version,
        supported: CURRENT_VERSION,
      },
    };
  }
  return { kind: 'parsed', params: parsed.data };
};

const levenshtein = (a: string, b: string) => {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
};

const findClosestApp = (target: string, candidates: string[]) => {
  let best: { id: string; distance: number } | null = null;
  const lowerTarget = target.toLowerCase();
  candidates.forEach((candidate) => {
    const lowerCandidate = candidate.toLowerCase();
    const distance = levenshtein(lowerTarget, lowerCandidate);
    const threshold = Math.max(1, Math.floor(Math.min(lowerTarget.length, lowerCandidate.length) / 2));
    if (distance > threshold) return;
    if (!best || distance < best.distance || (distance === best.distance && candidate.length < best.id.length)) {
      best = { id: candidate, distance };
    }
  });
  return best;
};

export type DeepLinkResolution =
  | {
      ok: true;
      value: {
        appId: string;
        reason: DeepLinkFallbackMode;
        context?: Record<string, unknown>;
      };
    }
  | {
      ok: false;
      error: DeepLinkError;
    };

export const resolveDeepLink = (
  params: DeepLinkParams,
  options: { availableIds?: string[]; expectedId?: string } = {}
): DeepLinkResolution => {
  const available = options.availableIds ?? defaultAppIds;
  const expected = options.expectedId;
  if (available.includes(params.targetId)) {
    if (expected && params.targetId !== expected) {
      return {
        ok: false,
        error: {
          code: 'mismatch',
          message: `Deep link targets \"${params.targetId}\" but this page handles \"${expected}\"`,
          expected,
          resolved: params.targetId,
          suggestion: params.targetId,
        },
      };
    }
    return {
      ok: true,
      value: { appId: params.targetId, reason: 'exact', context: params.context },
    };
  }
  if (params.fallback === 'open-closest') {
    const closest = findClosestApp(params.targetId, available);
    if (closest) {
      if (expected && closest.id !== expected) {
        return {
          ok: false,
          error: {
            code: 'mismatch',
            message: `Deep link resolves to \"${closest.id}\" via fallback but this page handles \"${expected}\"`,
            expected,
            resolved: closest.id,
            suggestion: closest.id,
          },
        };
      }
      return {
        ok: true,
        value: { appId: closest.id, reason: 'open-closest', context: params.context },
      };
    }
  }
  return {
    ok: false,
    error: {
      code: 'not-found',
      message: `Unable to locate application \"${params.targetId}\"`,
      target: params.targetId,
    },
  };
};

type DeepLinkPageOptions = {
  id: string;
  loader: () => Promise<{ default: React.ComponentType<any> }>;
  title?: string;
  loading?: () => JSX.Element;
};

const defaultLoading = () => <p>Loading...</p>;

export const withDeepLinkBoundary = <P extends Record<string, unknown>>(
  id: string,
  Component: ComponentType<P>,
  options?: { title?: string }
) => {
  const Boundary = (props: P) => {
    const router = useRouter();
    const state = useMemo(() => {
      if (!router.isReady) {
        return { kind: 'pending' } as const;
      }
      const parsed = parseDeepLinkQuery(router.query);
      if (parsed.kind === 'none') return { kind: 'ready', deepLink: undefined } as const;
      if (parsed.kind === 'error') return { kind: 'error', error: parsed.error } as const;
      const resolution = resolveDeepLink(parsed.params, { expectedId: id });
      if (!resolution.ok) {
        return { kind: 'error', error: resolution.error } as const;
      }
      return { kind: 'ready', deepLink: resolution.value } as const;
    }, [router.isReady, router.query]);

    if (state.kind === 'error') {
      return <DeepLinkRescue appTitle={options?.title ?? id} error={state.error} />;
    }

    const mergedProps: P & { deepLink?: typeof state.deepLink } = { ...props };
    if (state.deepLink) {
      (mergedProps as any).deepLink = state.deepLink;
    }
    return <Component {...mergedProps} />;
  };

  Boundary.displayName = `DeepLinkBoundary(${Component.displayName ?? Component.name ?? 'Component'})`;
  return Boundary;
};

export const createDeepLinkPage = ({ id, loader, title, loading }: DeepLinkPageOptions) => {
  const DynamicComponent = dynamic(loader, {
    ssr: false,
    loading: loading ?? defaultLoading,
  });
  return withDeepLinkBoundary(id, DynamicComponent, { title });
};

export const __private__ = {
  levenshtein,
  findClosestApp,
  hasDeepLinkKeys,
  normalizeQuery,
  CURRENT_VERSION,
};
