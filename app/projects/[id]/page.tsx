import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import ProjectGrid from '../_components/ProjectGrid';
import ProjectModal from '../_components/ProjectModal';
import { getProjectById, getProjectParams, getProjects } from '../_lib/projects';

type ProjectPageProps = {
  params: {
    id: string;
  };
};

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const project = getProjectById(params.id);

  if (!project) {
    return {
      title: 'Project not found | Kali Linux Portfolio',
    };
  }

  return {
    title: `${project.title} | Kali Linux Portfolio`,
    description: project.description,
  };
}

export default function ProjectStandalonePage({ params }: ProjectPageProps) {
  const project = getProjectById(params.id);
  const projects = getProjects();

  if (!project) {
    notFound();
  }

  return (
    <>
      <ProjectGrid projects={projects} activeId={project.id} />
      <ProjectModal project={project} isStandalone />
    </>
  );
}

export function generateStaticParams() {
  return getProjectParams();
}
