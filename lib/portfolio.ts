import narratives from '../data/projects.json';
import snapshot from '../data/github-projects.json';

export interface RepositoryMetadata {
  fork: boolean;
  archived: boolean;
  language: string | null;
  verifiedAt: string;
  upstream: string | null;
}
export type Project = (typeof narratives)[number] & {
  metadata: RepositoryMetadata | undefined;
  isFork: boolean;
};

// Committed data only: importing this module never contacts GitHub.
export function getProjects(
  metadata: Record<string, RepositoryMetadata> = snapshot,
): Project[] {
  return narratives.map((project) => {
    const repo = project.repo.replace('https://github.com/', '');
    const verified = metadata[repo];
    const isFork = project.kind === 'fork' || verified?.fork === true;
    return {
      ...project,
      metadata: verified,
      isFork,
      featured: project.featured && project.kind === 'project' &&
        verified?.fork === false && verified?.archived === false,
    };
  });
}
export const projects = getProjects();
export const featuredProjects = projects.filter((project) => project.featured);
export const projectKind = (project: Project): string =>
  project.isFork ? 'Upstream fork' : project.kind === 'lab' ? 'Engineering lab' : 'Independent repository';
