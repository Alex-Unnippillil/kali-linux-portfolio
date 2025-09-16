const SITE_URL = 'https://unnippillil.com';

type JsonLd = Record<string, unknown>;

export interface ProjectForSchema {
  name?: string;
  link?: string;
  description?: string[] | string;
  domains?: string[];
}

export interface ProjectListOptions {
  /**
   * Optional limit on how many projects should be included in the ItemList. Any value less than 1
   * results in an empty list.
   */
  limit?: number;
  /**
   * Optional override for the ItemList name. Defaults to "Alex Unnippillil Projects".
   */
  listName?: string;
  /**
   * Optional override for the canonical URL of the ItemList.
   */
  listUrl?: string;
}

const PERSON_SOCIAL_LINKS = [
  'https://github.com/Alex-Unnippillil',
  'https://www.linkedin.com/in/unnippillil/',
];

const PERSON_KNOWS_ABOUT = [
  'Cybersecurity',
  'Penetration Testing',
  'Network Security',
  'Cloud Security',
  'Software Development',
];

export const generatePersonSchema = (): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Alex Unnippillil',
  url: SITE_URL,
  image: `${SITE_URL}/images/logos/bitmoji.png`,
  jobTitle: 'Cybersecurity Specialist',
  sameAs: PERSON_SOCIAL_LINKS,
  knowsAbout: PERSON_KNOWS_ABOUT,
  alumniOf: [
    {
      '@type': 'CollegeOrUniversity',
      name: 'Ontario Tech University',
      sameAs: 'https://ontariotechu.ca/',
    },
  ],
});

const normalizeDescription = (description?: string[] | string): string | undefined => {
  if (!description) return undefined;
  if (Array.isArray(description)) {
    const merged = description.map((line) => line.trim()).filter(Boolean).join(' ');
    return merged || undefined;
  }
  const trimmed = description.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeKeywords = (domains?: string[]): string | undefined => {
  if (!domains?.length) return undefined;
  const filtered = domains.map((domain) => domain.trim()).filter(Boolean);
  return filtered.length ? filtered.join(', ') : undefined;
};

type NormalizedProject = Required<Pick<ProjectForSchema, 'name' | 'link'>> &
  Pick<ProjectForSchema, 'description' | 'domains'>;

const sanitizeProjects = (
  projects: ProjectForSchema[],
  limit?: number,
): NormalizedProject[] => {
  const finiteLimit =
    typeof limit === 'number' && Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : undefined;
  const uniqueByLink = new Map<string, NormalizedProject>();

  projects.forEach((project) => {
    if (!project?.name || !project?.link) return;
    const link = String(project.link).trim();
    const name = String(project.name).trim();
    if (!link || !name) return;
    if (!uniqueByLink.has(link)) {
      uniqueByLink.set(link, {
        ...project,
        name,
        link,
      });
    }
  });

  const values = Array.from(uniqueByLink.values());
  if (finiteLimit === undefined) {
    return values;
  }
  return values.slice(0, finiteLimit);
};

export const generateProjectItemList = (
  projects: ProjectForSchema[],
  { limit, listName, listUrl }: ProjectListOptions = {},
): JsonLd => {
  const sanitizedProjects = sanitizeProjects(projects, limit);
  const itemListElement = sanitizedProjects.map((project, index) => {
    const description = normalizeDescription(project.description);
    const keywords = normalizeKeywords(project.domains);

    const item: Record<string, unknown> = {
      '@type': 'SoftwareSourceCode',
      name: project.name,
      url: project.link,
      creator: {
        '@type': 'Person',
        name: 'Alex Unnippillil',
        url: SITE_URL,
      },
    };

    if (description) {
      item.description = description;
    }
    if (keywords) {
      item.keywords = keywords;
    }

    return {
      '@type': 'ListItem',
      position: index + 1,
      url: project.link,
      item,
    };
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName ?? 'Alex Unnippillil Projects',
    url: listUrl ?? `${SITE_URL}/apps/about#projects`,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: itemListElement.length,
    itemListElement,
  };
};

export const generatePortfolioJsonLd = (
  projects: ProjectForSchema[],
  options?: ProjectListOptions,
): JsonLd[] => [generatePersonSchema(), generateProjectItemList(projects, options)];

export { SITE_URL };
