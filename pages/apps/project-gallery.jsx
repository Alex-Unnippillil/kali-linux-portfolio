import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const ProjectGalleryApp = dynamic(() => import('../../apps/project-gallery/pages'), {
  ssr: false,
  loading: () => getAppSkeleton('project-gallery', 'Project Gallery'),
});

export default ProjectGalleryApp;
