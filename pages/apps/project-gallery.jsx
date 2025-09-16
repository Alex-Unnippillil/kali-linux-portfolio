import { getPageMetadata } from '@/lib/metadata';
import dynamic from 'next/dynamic';
export const metadata = getPageMetadata('/apps/project-gallery');

const ProjectGalleryApp = dynamic(() => import('../../apps/project-gallery/pages'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default ProjectGalleryApp;
