import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const ProjectGalleryApp = dynamic(() => import('../../apps/project-gallery/pages'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default withDeepLinkBoundary('project-gallery', ProjectGalleryApp);