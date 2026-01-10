import type { GetStaticProps } from 'next';

import DocVersionPage from '../../../components/docs/DocVersionPage';
import { createDocStaticPaths, createDocStaticProps } from '../../../lib/docs/pageData';

export default DocVersionPage;

export const getStaticPaths = createDocStaticPaths('v1');
export const getStaticProps: GetStaticProps = createDocStaticProps({ routeVersionId: 'v1' });
