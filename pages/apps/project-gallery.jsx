import dynamic from 'next/dynamic';
import Head from 'next/head';

const ProjectGalleryApp = dynamic(() => import('../../apps/project-gallery/pages'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
  webpackPrefetch: false,
});

export default function ProjectGalleryPage() {
  return (
    <>
      <Head>
        <title>Project Gallery</title>
        <meta
          name="description"
          content="Explore a curated collection of projects from this portfolio."
        />
        <meta property="og:title" content="Project Gallery" />
        <meta
          property="og:description"
          content="Explore a curated collection of projects from this portfolio."
        />
        <meta
          property="og:image"
          content="https://unnippillil.com/images/logos/logo_1200.png"
        />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Project Gallery" />
        <meta
          property="twitter:description"
          content="Explore a curated collection of projects from this portfolio."
        />
        <meta
          property="twitter:image"
          content="https://unnippillil.com/images/logos/logo_1200.png"
        />
      </Head>
      <ProjectGalleryApp />
    </>
  );
}
