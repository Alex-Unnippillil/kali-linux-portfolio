import rawProjects from '../../../data/projects.json';

export interface Project {
  id: number;
  title: string;
  description: string;
  stack: string[];
  tags: string[];
  year: number;
  type: string;
  thumbnail: string;
  demo?: string;
  repo?: string;
  snippet?: string;
  language?: string;
}

export interface ProjectFilters {
  stack?: string | string[];
  year?: string;
  type?: string;
  tags?: string[];
  search?: string;
  demoOnly?: boolean;
}

export interface ProjectOptions {
  stacks: string[];
  years: number[];
  types: string[];
  tags: string[];
}

const normalizeArray = (value?: string[]): string[] => (Array.isArray(value) ? value : []);

const normalizedProjects: Project[] = (rawProjects as Project[]).map((project) => ({
  ...project,
  stack: normalizeArray(project.stack),
  tags: normalizeArray(project.tags),
}));

export const projectCatalog: readonly Project[] = Object.freeze(normalizedProjects);

export const getProjectOptions = (projects: readonly Project[]): ProjectOptions => {
  const stacks = Array.from(new Set(projects.flatMap((project) => project.stack))).sort((a, b) =>
    a.localeCompare(b)
  );
  const years = Array.from(new Set(projects.map((project) => project.year))).sort((a, b) => b - a);
  const types = Array.from(new Set(projects.map((project) => project.type))).sort((a, b) =>
    a.localeCompare(b)
  );
  const tags = Array.from(new Set(projects.flatMap((project) => project.tags))).sort((a, b) =>
    a.localeCompare(b)
  );

  return { stacks, years, types, tags };
};

export const filterProjects = (
  projects: readonly Project[],
  { stack, year, type, tags, search, demoOnly }: ProjectFilters
): Project[] => {
  const stackFilters = stack
    ? (Array.isArray(stack) ? stack : [stack]).filter(Boolean).map((value) => value.toLowerCase())
    : [];
  const tagFilters = (tags ?? []).filter(Boolean).map((value) => value.toLowerCase());
  const searchTerm = search?.trim().toLowerCase() ?? '';

  return projects.filter((project) => {
    const projectStacks = project.stack.map((value) => value.toLowerCase());
    const projectTags = project.tags.map((value) => value.toLowerCase());

    if (stackFilters.length && !stackFilters.every((value) => projectStacks.includes(value))) {
      return false;
    }

    if (year && String(project.year) !== year) {
      return false;
    }

    if (type && project.type !== type) {
      return false;
    }

    if (tagFilters.length && !tagFilters.every((value) => projectTags.includes(value))) {
      return false;
    }

    if (demoOnly && !project.demo) {
      return false;
    }

    if (searchTerm) {
      const haystack = [
        project.title,
        project.description,
        project.type,
        project.language ?? '',
        ...project.stack,
        ...project.tags,
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });
};

export const findProjectById = (id: number): Project | undefined =>
  projectCatalog.find((project) => project.id === id);
