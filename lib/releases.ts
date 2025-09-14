import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface ReleaseMeta {
  slug: string;
  version: string;
  title: string;
  lts?: boolean;
  eol?: string;
}

const releasesDir = path.join(process.cwd(), 'data', 'releases');

export function getReleases(): ReleaseMeta[] {
  return fs
    .readdirSync(releasesDir)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => {
      const slug = file.replace(/\.mdx$/, '');
      const { data } = matter.read(path.join(releasesDir, file));
      return { slug, ...data } as ReleaseMeta;
    });
}
