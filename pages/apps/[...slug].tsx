import type { GetServerSideProps } from 'next';

import AppsNotFound from '../../app/apps/not-found';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  if (res) {
    res.statusCode = 404;
  }

  return { props: {} };
};

export default function AppsCatchAllNotFound() {
  return <AppsNotFound />;
}
