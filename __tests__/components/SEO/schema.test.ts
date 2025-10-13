import alexData from '../../../components/apps/alex/data.json';
import moduleIndex from '../../../data/module-index.json';
import packageJson from '../../../package.json';
import {
  PERSON_SCHEMA,
  SITE_METADATA,
  buildPortfolioSchema,
  buildSoftwareApplicationSchema,
} from '../../../components/SEO/schema';

type Project = {
  name: string;
  link?: string;
  description?: string[];
};

type Module = {
  name: string;
  description: string;
  tags?: string[];
};

const projects: Project[] = Array.isArray((alexData as { projects?: Project[] }).projects)
  ? ((alexData as { projects?: Project[] }).projects as Project[])
  : [];

const modules: Module[] = Array.isArray(moduleIndex)
  ? (moduleIndex as Module[]).filter((entry) => entry?.name && entry?.description)
  : [];

describe('SEO schema generators', () => {
  it('buildPortfolioSchema returns work examples derived from portfolio data', () => {
    const limit = 4;
    const schema = buildPortfolioSchema({ projectLimit: limit }) as {
      '@type': string;
      workExample?: Array<Record<string, unknown>>;
      creator?: { name?: unknown };
    };

    expect(schema['@type']).toBe('Portfolio');
    const expectedProjects = projects.slice(0, limit);
    const workExample = schema.workExample ?? [];
    expect(workExample).toHaveLength(expectedProjects.length);

    expectedProjects.forEach((project, index) => {
      const work = workExample[index] as { name?: unknown; url?: unknown; description?: unknown };
      expect(work?.name).toBe(project.name);
      expect(work?.url).toBe(project.link);
      if (project.description?.length) {
        expect(work?.description).toBe(project.description[0]);
      }
    });

    const personName = PERSON_SCHEMA.name as string | undefined;
    expect(schema.creator?.name).toBe(personName);
  });

  it('buildPortfolioSchema merges keywords from site metadata and modules', () => {
    const schema = buildPortfolioSchema() as { keywords?: string };
    const keywordString = schema.keywords ?? '';
    SITE_METADATA.keywords.forEach((keyword) => {
      expect(keywordString).toContain(keyword);
    });

    const firstTag = modules.find((module) => module.tags?.length)?.tags?.[0];
    if (firstTag) {
      expect(keywordString).toContain(firstTag);
    }
  });

  it('buildSoftwareApplicationSchema exposes feature list and version', () => {
    const limit = 5;
    const schema = buildSoftwareApplicationSchema({ featureLimit: limit }) as {
      featureList?: string[];
      softwareVersion?: string;
      sameAs?: string[];
      keywords?: string;
    };

    expect(schema.softwareVersion).toBe(packageJson.version);
    const expectedModules = modules.slice(0, limit);
    const featureList = schema.featureList ?? [];
    expect(featureList).toHaveLength(expectedModules.length);
    expectedModules.forEach((module, index) => {
      const feature = featureList[index];
      expect(feature).toContain(module.name);
      expect(feature).toContain(module.description);
    });

    expect(schema.sameAs).toEqual(SITE_METADATA.sameAs);

    const keywordString = schema.keywords ?? '';
    SITE_METADATA.keywords.forEach((keyword) => {
      expect(keywordString).toContain(keyword);
    });
    const moduleTag = modules.find((module) => module.tags?.length)?.tags?.[0];
    if (moduleTag) {
      expect(keywordString).toContain(moduleTag);
    }
  });
});

