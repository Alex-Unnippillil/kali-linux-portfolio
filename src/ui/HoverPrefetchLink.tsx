'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ComponentPropsWithoutRef,
  MouseEvent,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

type LinkComponentProps = ComponentPropsWithoutRef<typeof Link>;

type HoverPrefetchLinkProps = Omit<LinkComponentProps, 'prefetch' | 'onMouseEnter'> & {
  onMouseEnter?: LinkComponentProps['onMouseEnter'];
};

type UrlObject = Exclude<LinkComponentProps['href'], string>;

type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly string[]
  | readonly number[]
  | readonly boolean[];

type QueryInput =
  | Record<string, QueryValue>
  | string
  | null
  | undefined;

const encodeQueryValue = (key: string, value: unknown) =>
  `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;

const toQueryString = (query: QueryInput): string => {
  if (!query) {
    return '';
  }

  if (typeof query === 'string') {
    return query.startsWith('?') ? query.slice(1) : query;
  }

  const parts: string[] = [];

  Object.entries(query).forEach(([key, value]) => {
    if (typeof value === 'undefined') {
      return;
    }

    const append = (item: unknown) => {
      if (typeof item === 'undefined') {
        return;
      }

      if (item === null) {
        parts.push(`${encodeURIComponent(key)}=`);
        return;
      }

      parts.push(encodeQueryValue(key, item));
    };

    if (Array.isArray(value)) {
      value.forEach(append);
    } else {
      append(value);
    }
  });

  return parts.join('&');
};

const toPrefetchTarget = (href: LinkComponentProps['href']): string | null => {
  if (typeof href === 'string') {
    return href;
  }

  if (!href) {
    return null;
  }

  const url = href as UrlObject;

  if (typeof url.href === 'string' && url.href.length > 0) {
    return url.href;
  }

  let pathname = '';

  if (typeof url.pathname === 'string') {
    pathname = url.pathname;
  }

  let search = '';

  if (typeof url.search === 'string' && url.search.length > 0) {
    search = url.search.startsWith('?') ? url.search : `?${url.search}`;
  } else {
    const queryString = toQueryString(url.query as QueryInput);

    if (queryString) {
      search = `?${queryString}`;
    }
  }

  if (!pathname && typeof url.path === 'string' && url.path.length > 0) {
    if (url.path.includes('?')) {
      const [pathPart, ...rest] = url.path.split('?');
      pathname = pathPart;

      if (!search && rest.length > 0) {
        search = `?${rest.join('?')}`;
      }
    } else {
      pathname = url.path;
    }
  }

  const hash =
    typeof url.hash === 'string' && url.hash.length > 0
      ? url.hash.startsWith('#')
        ? url.hash
        : `#${url.hash}`
      : '';

  const candidate = `${pathname}${search}${hash}`;

  return candidate || null;
};

const HoverPrefetchLink = forwardRef<HTMLAnchorElement, HoverPrefetchLinkProps>(
  ({ onMouseEnter, href, ...rest }, ref) => {
    const router = useRouter();
    const prefetchedRef = useRef(false);
    const targetHref = useMemo(() => toPrefetchTarget(href), [href]);

    useEffect(() => {
      prefetchedRef.current = false;
    }, [targetHref]);

    const handleMouseEnter = useCallback(
      (event: MouseEvent<HTMLAnchorElement>) => {
        onMouseEnter?.(event);

        if (!prefetchedRef.current && targetHref) {
          prefetchedRef.current = true;

          void router.prefetch(targetHref).catch(() => {
            prefetchedRef.current = false;
          });
        }
      },
      [onMouseEnter, router, targetHref],
    );

    return (
      <Link
        {...rest}
        href={href}
        prefetch={false}
        ref={ref}
        onMouseEnter={handleMouseEnter}
      />
    );
  },
);

HoverPrefetchLink.displayName = 'HoverPrefetchLink';

export default HoverPrefetchLink;
