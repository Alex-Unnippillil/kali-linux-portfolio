import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';

interface Segment {
  name: string;
}

interface Props {
  path: Segment[];
  onNavigate: (index: number) => void;
}

type BreadcrumbListItem = {
  '@type': 'ListItem';
  position: number;
  name: string;
  item: string;
};

type BreadcrumbListSchema = {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: BreadcrumbListItem[];
};

const Breadcrumbs: React.FC<Props> = ({ path, onNavigate }) => {
  const router = useRouter();
  const defaultOriginRef = React.useRef(
    process.env.NEXT_PUBLIC_SITE_URL
      ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
      : ''
  );
  const [origin, setOrigin] = React.useState(defaultOriginRef.current);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const pathname = router?.asPath ?? '/';
  const normalizedPathname = React.useMemo(() => {
    const [withoutQuery] = pathname.split('?');
    const [cleanPath] = withoutQuery.split('#');
    return cleanPath || '/';
  }, [pathname]);

  const routeSegments = React.useMemo(() => {
    if (normalizedPathname === '/' || normalizedPathname === '') {
      return [] as string[];
    }
    return normalizedPathname.split('/').filter(Boolean);
  }, [normalizedPathname]);

  const breadcrumbJsonLd = React.useMemo<BreadcrumbListSchema>(() => {
    const normalizedOrigin = origin ? origin.replace(/\/$/, '') : '';
    const normalizedBasePath = router?.basePath ? router.basePath.replace(/\/$/, '') : '';

    const humanizeSegment = (segment: string) => {
      const decoded = (() => {
        try {
          return decodeURIComponent(segment.replace(/\+/g, ' '));
        } catch (error) {
          return segment;
        }
      })();

      return decoded
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    };

    const buildItemUrl = (slugPath: string) => {
      const pathValue = slugPath.startsWith('/') ? slugPath : `/${slugPath}`;

      if (normalizedOrigin) {
        try {
          return new URL(`${normalizedBasePath}${pathValue}`, `${normalizedOrigin}/`).toString();
        } catch (error) {
          return `${normalizedOrigin}${normalizedBasePath}${pathValue}`;
        }
      }

      const combined = `${normalizedBasePath}${pathValue}`;
      return combined || pathValue || '/';
    };

    const items: BreadcrumbListItem[] = [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: buildItemUrl('/'),
      },
    ];

    routeSegments.forEach((segment, index) => {
      const slug = `/${routeSegments.slice(0, index + 1).join('/')}`;
      items.push({
        '@type': 'ListItem',
        position: index + 2,
        name: humanizeSegment(segment),
        item: buildItemUrl(slug),
      });
    });

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items,
    };
  }, [origin, routeSegments, router?.basePath]);

  const breadcrumbJsonLdString = React.useMemo(
    () => JSON.stringify(breadcrumbJsonLd),
    [breadcrumbJsonLd]
  );

  return (
    <>
      <Head>
        <script
          key="breadcrumbs-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: breadcrumbJsonLdString }}
        />
      </Head>
      <nav aria-label="Breadcrumb">
        <ol className="m-0 flex list-none items-center p-0 text-white">
          {path.map((seg, idx) => {
            const isLast = idx === path.length - 1;
            const itemClassName =
              idx === 0
                ? 'flex items-center'
                : "flex items-center before:mx-2 before:text-white/60 before:content-['/']";

            if (isLast) {
              return (
                <li key={idx} className={itemClassName}>
                  <span aria-current="page" className="font-semibold text-white">
                    {seg.name || '/'}
                  </span>
                </li>
              );
            }

            return (
              <li key={idx} className={itemClassName}>
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(idx);
                  }}
                  className="text-white transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
                >
                  {seg.name || '/'}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
};

export default Breadcrumbs;
