import type { GetStaticProps } from 'next';

import DocVersionPage from '../../../components/docs/DocVersionPage';
import { createDocStaticPaths, createDocStaticProps } from '../../../lib/docs/pageData';
import { DOCS_LATEST_VERSION_ID } from '../../../lib/docs/versions';

export default DocVersionPage;

export const getStaticPaths = createDocStaticPaths(DOCS_LATEST_VERSION_ID);
export const getStaticProps: GetStaticProps = createDocStaticProps({
  routeVersionId: DOCS_LATEST_VERSION_ID,
  aliasForLatest: true,
});
