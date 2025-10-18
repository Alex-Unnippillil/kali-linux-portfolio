import type { GetStaticPathsResult, GetStaticPropsContext, GetStaticPropsResult } from 'next';

import type { DocPageProps } from '../../components/docs/DocVersionPage';
import {
  DOCS_LATEST_VERSION_ID,
  DOCS_VERSIONS,
  getDocsVersionLabel,
} from './versions';
import {
  augmentNavWithFallback,
  buildDocsIndex,
  loadDoc,
  loadDocWithFallback,
  renderDocContent,
} from './content';
import type { DocsVersion } from './versions';
import { normalizeDocSlug } from './slug';

export interface VersionPageConfig {
  routeVersionId: string;
  aliasForLatest?: boolean;
}

export function createDocStaticPaths(versionId: string) {
  return async (): Promise<GetStaticPathsResult> => {
    const index = await buildDocsIndex(versionId);
    const paths = index.docs.map((doc) => ({ params: { slug: doc.slug.split('/') } }));
    return {
      paths,
      fallback: 'blocking',
    };
  };
}

function buildBaseProps(versionId: string, aliasForLatest?: boolean) {
  return {
    routeVersionId: versionId,
    requestedVersionId: aliasForLatest ? 'latest' : versionId,
    requestedVersionLabel: aliasForLatest
      ? `Latest (${getDocsVersionLabel(versionId)})`
      : getDocsVersionLabel(versionId),
    latestVersionId: DOCS_LATEST_VERSION_ID,
    latestVersionLabel: getDocsVersionLabel(DOCS_LATEST_VERSION_ID),
    availableVersions: DOCS_VERSIONS as DocsVersion[],
  } satisfies Pick<DocPageProps, 'routeVersionId' | 'requestedVersionId' | 'requestedVersionLabel' | 'latestVersionId' | 'latestVersionLabel' | 'availableVersions'>;
}

export function createDocStaticProps(config: VersionPageConfig) {
  return async (
    ctx: GetStaticPropsContext<{ slug?: string[] }>
  ): Promise<GetStaticPropsResult<DocPageProps>> => {
    const slug = normalizeDocSlug(ctx.params?.slug);
    const actualVersionId = config.aliasForLatest ? DOCS_LATEST_VERSION_ID : config.routeVersionId;
    const index = await buildDocsIndex(actualVersionId);

    if (!slug) {
      return {
        props: {
          ...buildBaseProps(config.routeVersionId, config.aliasForLatest),
          resolvedVersionId: actualVersionId,
          resolvedVersionLabel: getDocsVersionLabel(actualVersionId),
          nav: index.nav,
          doc: null,
          fallbackVersionId: null,
          activeSlug: null,
          isIndex: true,
          docCount: index.docs.length,
          aliasForLatest: config.aliasForLatest,
        },
        revalidate: 60,
      };
    }

    const loaded = config.aliasForLatest
      ? await loadDoc(actualVersionId, slug)
      : await loadDocWithFallback(config.routeVersionId, slug);

    if (!loaded) {
      return { notFound: true };
    }

    const resolvedIndex =
      loaded.resolvedVersionId === actualVersionId
        ? index
        : await buildDocsIndex(loaded.resolvedVersionId);

    const nav = config.aliasForLatest
      ? resolvedIndex.nav
      : augmentNavWithFallback(index.nav, loaded);

    return {
      props: {
        ...buildBaseProps(config.routeVersionId, config.aliasForLatest),
        resolvedVersionId: loaded.resolvedVersionId,
        resolvedVersionLabel: getDocsVersionLabel(loaded.resolvedVersionId),
        nav,
        doc: {
          slug: loaded.record.slug,
          title: loaded.record.title,
          html: renderDocContent(loaded.record),
        },
        fallbackVersionId: loaded.fallbackVersionId ?? null,
        activeSlug: slug,
        isIndex: false,
        docCount: index.docs.length,
        aliasForLatest: config.aliasForLatest,
      },
      revalidate: 60,
    };
  };
}
