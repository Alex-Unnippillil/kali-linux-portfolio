import type { GetServerSideProps } from 'next';
import { generateModuleWorkspaceRssFeed } from '../../lib/feeds/moduleWorkspace';

const ModuleWorkspaceRssFeed = () => null;

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const xml = generateModuleWorkspaceRssFeed();
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.write(xml);
  res.end();
  return { props: {} };
};

export default ModuleWorkspaceRssFeed;
