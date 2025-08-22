import dynamic from 'next/dynamic';
import type { GetStaticProps } from 'next';

const PasswordGenerator = dynamic(() => import('../../apps/password_generator'), {
  ssr: false,
});

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
    // Revalidate every minute to keep bundle fresh without
    // paying the cost of on-demand rendering for each request.
    revalidate: 60,
  };
};

export default function PasswordGeneratorPage() {
  return <PasswordGenerator />;
}
