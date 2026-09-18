import { getProjects, projects, featuredProjects } from '../lib/portfolio';
import snapshot from '../data/github-projects.json';
import publicProjects from '../public/projects.json';
import narratives from '../data/projects.json';
describe('portfolio provenance', () => {
  it('keeps the generated mirror identical', () => { expect(publicProjects).toEqual(narratives); });
  it('only features verified non-fork, non-archived projects', () => {
    expect(featuredProjects.length).toBe(3);
    for (const p of featuredProjects) { expect(p.metadata?.fork).toBe(false); expect(p.metadata?.archived).toBe(false); expect(p.kind).toBe('project'); }
  });
  it('fails closed on unknown metadata or a newly discovered fork', () => {
    expect(getProjects({}).filter((p) => p.featured)).toEqual([]);
    const metadata = { ...snapshot, 'Alex-Unnippillil/web-crawler': { ...snapshot['Alex-Unnippillil/web-crawler'], fork: true } };
    const crawler = getProjects(metadata).find((p) => p.slug === 'web-crawler');
    expect(crawler?.featured).toBe(false); expect(crawler?.isFork).toBe(true);
  });
  it('labels forks and keeps slugs unique', () => {
    expect(projects.find((p) => p.slug === 'gpt-researcher-fork')?.isFork).toBe(true);
    expect(new Set(projects.map((p) => p.slug)).size).toBe(projects.length);
  });
});
