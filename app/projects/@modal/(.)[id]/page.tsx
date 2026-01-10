import { notFound } from 'next/navigation';

import ProjectModal from '@/app/projects/_components/ProjectModal';
import { getProjectById, getProjectParams } from '@/app/projects/_lib/projects';

type ModalPageProps = {
  params: {
    id: string;
  };
};

export default function ProjectModalPage({ params }: ModalPageProps) {
  const project = getProjectById(params.id);

  if (!project) {
    notFound();
  }

  return <ProjectModal project={project} />;
}

export function generateStaticParams() {
  return getProjectParams();
}
