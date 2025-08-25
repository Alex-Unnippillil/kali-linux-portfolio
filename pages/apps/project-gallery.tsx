import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const ProjectGallery = dynamic(() => import('../../apps/project-gallery'), {
  ssr: false,
});

export default function ProjectGalleryPage() {
  return (
    <UbuntuWindow title="project gallery">
      <ProjectGallery />
    </UbuntuWindow>
  );
}
