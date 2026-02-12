import aboutData from '@/components/apps/alex/data.json';

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

export const SITE_URL = 'https://unnippillil.com';
export const FEED_TITLE = 'Alex Unnippillil — Portfolio Projects';
export const FEED_DESCRIPTION =
  'Recently highlighted projects and experiments from the Kali Linux portfolio desktop experience.';

interface RawProject {
  name: string;
  date: string;
  link?: string;
  description?: string[];
  domains?: string[];
}

interface AboutData {
  projects?: RawProject[];
}

export interface FeedItem {
  id: string;
  url: string;
  title: string;
  summary: string;
  date: Date;
  tags: string[];
}

const data = aboutData as AboutData;

function parseProjectDate(value: string | undefined): Date {
  if (!value) {
    return new Date();
  }
  const normalized = value.trim();
  const parts = normalized.toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 2) {
    const [maybeMonth, maybeYear] = parts;
    const monthIndex = MONTH_MAP[maybeMonth];
    const yearNumber = Number(maybeYear);
    if (typeof monthIndex === 'number' && !Number.isNaN(yearNumber)) {
      return new Date(Date.UTC(yearNumber, monthIndex, 1));
    }
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return new Date();
}

function buildSummary(project: RawProject): string {
  const joinedDescription = project.description?.join(' ');
  const description = joinedDescription ? joinedDescription.trim() : '';
  const domainSummary = project.domains && project.domains.length > 0
    ? `Domains: ${project.domains.join(', ')}`
    : '';
  return [description, domainSummary].filter(Boolean).join(' ');
}

function deriveId(project: RawProject, fallbackUrl: string): string {
  const trimmedLink = project.link?.trim();
  if (trimmedLink) {
    return trimmedLink;
  }
  const slug = project.name
    ? project.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : 'project';
  return `${fallbackUrl}#${slug}`;
}

export function getFeedItems(): FeedItem[] {
  const projects = data.projects ?? [];
  const normalized = projects.map((project) => {
    const date = parseProjectDate(project.date);
    const url = project.link?.trim() || SITE_URL;
    return {
      id: deriveId(project, SITE_URL),
      url,
      title: project.name,
      summary: buildSummary(project),
      date,
      tags: project.domains ?? [],
    } satisfies FeedItem;
  });

  return normalized.sort((a, b) => b.date.getTime() - a.date.getTime());
}
