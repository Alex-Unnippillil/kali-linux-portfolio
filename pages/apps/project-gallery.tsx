import dynamic from 'next/dynamic';
import Head from 'next/head';

const ProjectGallery = dynamic(() => import('../../apps/project-gallery'), {
  ssr: false,
});

export default function ProjectGalleryPage() {
  const ogImage = '/images/logos/logo_1200.png';
  return (
    <>
      <Head>
        <title>Project Gallery</title>
        <meta property="og:title" content="Project Gallery" />
        <meta property="og:image" content={ogImage} />
      </Head>
      <ProjectGallery />
    </>
  );
}
