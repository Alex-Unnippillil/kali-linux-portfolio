import projectsData from '@/data/projects.json';

export type Project = {
  id: number;
  title: string;
  description: string;
  stack: string[];
  tags: string[];
  year: number;
  type: string;
  thumbnail: string;
  repo?: string;
  demo?: string;
  snippet?: string;
  language?: string;
};

const projects = projectsData as Project[];

export function getProjects(): Project[] {
  return projects;
}

export function getProjectById(id: string): Project | undefined {
  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    return undefined;
  }
  return projects.find((project) => project.id === numericId);
}

export function getProjectParams() {
  return projects.map((project) => ({ id: project.id.toString() }));
}
