import { filterProjects, Project } from '../../apps/project-gallery/lib/projects';

describe('filterProjects', () => {
  const projects: Project[] = [
    {
      id: 1,
      title: 'Alpha',
      description: 'React dashboard',
      stack: ['React', 'TypeScript'],
      tags: ['frontend', 'dashboard'],
      year: 2022,
      type: 'web',
      thumbnail: '/alpha.png',
      demo: 'https://example.com/alpha',
      repo: 'https://example.com/alpha-repo',
      snippet: "console.log('alpha');",
      language: 'typescript',
    },
    {
      id: 2,
      title: 'Beta',
      description: 'Node API',
      stack: ['Node', 'TypeScript'],
      tags: ['backend'],
      year: 2021,
      type: 'service',
      thumbnail: '/beta.png',
      repo: 'https://example.com/beta-repo',
    },
    {
      id: 3,
      title: 'Gamma',
      description: 'Vue SPA',
      stack: ['Vue'],
      tags: ['frontend'],
      year: 2023,
      type: 'web',
      thumbnail: '/gamma.png',
      demo: 'https://example.com/gamma',
    },
  ];

  it('returns all projects when no filters are applied', () => {
    const result = filterProjects(projects, {});
    expect(result).toHaveLength(3);
  });

  it('filters by single stack name', () => {
    const result = filterProjects(projects, { stack: 'React' });
    expect(result.map((project) => project.id)).toEqual([1]);
  });

  it('filters by multiple stack names', () => {
    const result = filterProjects(projects, { stack: ['TypeScript', 'Node'] });
    expect(result.map((project) => project.id)).toEqual([2]);
  });

  it('filters by tags', () => {
    const result = filterProjects(projects, { tags: ['frontend'] });
    expect(result.map((project) => project.id)).toEqual([1, 3]);
  });

  it('filters by search text across title and description', () => {
    const result = filterProjects(projects, { search: 'dashboard' });
    expect(result.map((project) => project.id)).toEqual([1]);
  });

  it('filters by demo availability', () => {
    const result = filterProjects(projects, { demoOnly: true });
    expect(result.map((project) => project.id)).toEqual([1, 3]);
  });
});
