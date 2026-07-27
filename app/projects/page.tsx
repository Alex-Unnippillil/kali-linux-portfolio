import type { Metadata } from 'next';

import ProjectGrid from './_components/ProjectGrid';
import { getProjects } from './_lib/projects';

export const metadata: Metadata = {
  title: 'Projects | Kali Linux Portfolio',
  description: 'Browse recent security tooling simulations, utilities, and experiments built for the Kali Linux desktop portfolio.',
};

export default function ProjectsPage() {
  const projects = getProjects();

  return <ProjectGrid projects={projects} />;
}
