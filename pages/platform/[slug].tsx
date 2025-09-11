import { GetStaticPaths, GetStaticProps } from 'next';
import Hero from '../../components/ui/Hero';
import { getPlatformSlugs, getPlatformBySlug, PlatformInfo } from '../../data/platforms';
import { features } from '../../data/features';

interface PlatformPageProps {
  platform: PlatformInfo;
}

export default function PlatformPage({ platform }: PlatformPageProps) {
  return (
    <main className="p-4 space-y-8">
      <Hero title={platform.title} summary={platform.bullets} meta={platform.meta} />
      <section className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="border rounded p-4 flex flex-col">
            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
            <p className="mb-4 flex-1">{feature.blurb}</p>
            <a
              href={feature.href}
              className="text-blue-500 hover:underline mt-auto"
            >
              Read Docs
            </a>
          </div>
        ))}
      </section>
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
  // Ensure the meta values are serializable
  const serializableMeta = platform.meta.map((m) => ({
    label: m.label,
    value: typeof m.value === 'string' ? m.value : '',
  }));
  return {
    props: {
      platform: { ...platform, meta: serializableMeta },
    },
  };
};

