import { GetStaticPaths, GetStaticProps } from 'next';
import Hero from '../../components/ui/Hero';
import { getPlatformSlugs, getPlatformBySlug, PlatformInfo } from '../../data/platforms';

interface PlatformPageProps {
  platform: PlatformInfo;
}

export default function PlatformPage({ platform }: PlatformPageProps) {
  return (
    <main className="p-4">
      <Hero title={platform.title} summary={platform.bullets} meta={platform.meta} />
    </main>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getPlatformSlugs();
  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<PlatformPageProps> = async ({ params }) => {
  const platform = getPlatformBySlug(params!.slug as string);
  if (!platform) {
    return { notFound: true };
  }
  return {
    props: {
      platform,
    },
  };
};

