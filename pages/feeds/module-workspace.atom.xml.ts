import type { GetServerSideProps } from 'next';
import { generateModuleWorkspaceAtomFeed } from '../../lib/feeds/moduleWorkspace';

const ModuleWorkspaceAtomFeed = () => null;

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const xml = generateModuleWorkspaceAtomFeed();
  res.setHeader('Content-Type', 'application/atom+xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.write(xml);
  res.end();
  return { props: {} };
};

export default ModuleWorkspaceAtomFeed;
