import dynamic from 'next/dynamic';

const ProjectGalleryApp = dynamic(() => import('../../apps/project-gallery/pages'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default ProjectGalleryApp;
