import dynamic from '@/utils/dynamic';

const ProjectGalleryApp = dynamic(() => import('@/apps/project-gallery/pages'), {
  ssr: false,
});

export default ProjectGalleryApp;
