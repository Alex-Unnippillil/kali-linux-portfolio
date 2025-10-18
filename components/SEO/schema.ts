import alexData from '../apps/alex/data.json';
import moduleIndex from '../../data/module-index.json';
import packageJson from '../../package.json';

interface ProjectEntry {
  name: string;
  link?: string;
  description?: string[];
  domains?: string[];
}

interface ModuleEntry {
  name: string;
  description: string;
  tags?: string[];
}

interface PortfolioSchemaOptions {
  projectLimit?: number;
}

interface SoftwareApplicationSchemaOptions {
  featureLimit?: number;
}

type SchemaObject = Record<string, unknown>;

const SITE_URL = 'https://unnippillil.com/';
const DEFAULT_LANGUAGE = 'en-CA';
const DEFAULT_PROJECT_LIMIT = 6;
const DEFAULT_FEATURE_LIMIT = 8;

const alexProjects: ProjectEntry[] = Array.isArray((alexData as { projects?: ProjectEntry[] }).projects)
  ? ((alexData as { projects?: ProjectEntry[] }).projects as ProjectEntry[])
  : [];

const modules: ModuleEntry[] = Array.isArray(moduleIndex)
  ? (moduleIndex as ModuleEntry[]).filter((entry) => entry?.name && entry?.description)
  : [];

const socialProfiles = [
  'https://github.com/Alex-Unnippillil',
  'https://www.linkedin.com/in/unnippillil/',
  'mailto:alex@unnippillil.com',
];

const knowledgeKeywords = Array.from(
  new Set(
    modules
      .map((module) => module.tags ?? [])
      .flat()
      .filter((tag): tag is string => Boolean(tag))
  )
).slice(0, 12);

export const SITE_METADATA = {
  title: "Alex Unnippillil's Portfolio",
  metaTitle: 'Alex Unnippillil Portfolio - Cybersecurity Specialist',
  description: 'Alex Unnippillil Personal Portfolio Website',
  author: 'Alex Unnippillil',
  keywords: [
    'Alex Unnippillil',
    "Unnippillil's portfolio",
    'Linux desktop portfolio',
    'Kali portfolio',
    'cybersecurity portfolio',
    'penetration testing simulations',
    'React desktop environment',
    'Next.js portfolio',
  ],
  url: SITE_URL,
  canonical: SITE_URL,
  themeColor: '#0f1317',
  language: 'English',
  locale: DEFAULT_LANGUAGE,
  category: '16',
  ogImage: 'https://unnippillil.com/images/logos/logo_1200.png',
  twitterImage: 'images/logos/logo_1024.png',
  icon: 'images/logos/fevicon.svg',
  appleIcon: 'images/logos/logo.png',
  sameAs: socialProfiles,
} as const;

const buildCombinedKeywordList = (): string[] =>
  Array.from(new Set([...SITE_METADATA.keywords, ...knowledgeKeywords]));

const PERSON_CORE = {
  '@type': 'Person',
  name: SITE_METADATA.author,
  url: SITE_METADATA.url,
  jobTitle: 'Cybersecurity Specialist',
  email: 'mailto:alex@unnippillil.com',
  image: 'https://unnippillil.com/images/logos/bitmoji.png',
  sameAs: SITE_METADATA.sameAs,
  knowsAbout: knowledgeKeywords,
};

export const PERSON_SCHEMA: SchemaObject = {
  '@context': 'https://schema.org',
  ...PERSON_CORE,
};

const createProjectDescription = (project: ProjectEntry): string | undefined => {
  if (Array.isArray(project.description) && project.description.length > 0) {
    return project.description[0];
  }

  if (typeof project.description === 'string') {
    return project.description;
  }

  return undefined;
};

const buildProjectCreativeWork = (project: ProjectEntry): SchemaObject => {
  const description = createProjectDescription(project);
  const keywords = Array.isArray(project.domains) ? project.domains.filter(Boolean) : [];

  return {
    '@type': 'CreativeWork',
    name: project.name,
    url: project.link,
    description,
    keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
  };
};

export const buildPortfolioSchema = (
  options: PortfolioSchemaOptions = {}
): SchemaObject => {
  const { projectLimit = DEFAULT_PROJECT_LIMIT } = options;
  const works = alexProjects.slice(0, projectLimit).map(buildProjectCreativeWork);
  const combinedKeywords = buildCombinedKeywordList();

  return {
    '@context': 'https://schema.org',
    '@type': 'Portfolio',
    name: SITE_METADATA.title,
    url: SITE_METADATA.url,
    description: SITE_METADATA.description,
    image: SITE_METADATA.ogImage,
    creator: PERSON_CORE,
    inLanguage: DEFAULT_LANGUAGE,
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: ['Learners', 'Recruiters'],
    },
    workExample: works,
    keywords: combinedKeywords.join(', '),
    sameAs: SITE_METADATA.sameAs,
  };
};

const buildFeatureList = (featureLimit: number): string[] =>
  modules
    .slice(0, featureLimit)
    .map((module) => `${module.name}: ${module.description}`);

export const buildSoftwareApplicationSchema = (
  options: SoftwareApplicationSchemaOptions = {}
): SchemaObject => {
  const { featureLimit = DEFAULT_FEATURE_LIMIT } = options;

  const featureList = buildFeatureList(featureLimit);
  const combinedKeywords = buildCombinedKeywordList();

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_METADATA.title,
    operatingSystem: 'Web',
    applicationCategory: 'EducationalApplication',
    applicationSubCategory: 'CybersecurityTrainingApplication',
    url: SITE_METADATA.url,
    description: SITE_METADATA.description,
    image: SITE_METADATA.ogImage,
    featureList,
    softwareVersion: packageJson.version,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    creator: PERSON_CORE,
    producer: PERSON_CORE,
    keywords: combinedKeywords.join(', '),
    inLanguage: DEFAULT_LANGUAGE,
    browserRequirements: 'Requires a modern web browser with JavaScript enabled.',
    potentialAction: {
      '@type': 'ViewAction',
      target: SITE_METADATA.url,
    },
    sameAs: SITE_METADATA.sameAs,
  };
};

