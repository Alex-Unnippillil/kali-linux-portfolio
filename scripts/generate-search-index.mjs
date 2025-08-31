import fg from 'fast-glob';
import { promises as fs } from 'fs';
import path from 'path';

async function generate() {
  const index = [];

  try {
    // Projects
    const projectsPath = 'public/projects.json';
    const projects = JSON.parse(await fs.readFile(projectsPath, 'utf8'));
    for (const p of projects) {
      index.push({
        type: 'project',
        title: p.title,
        url: '/apps/project-gallery',
        content: p.description || ''
      });
    }

    // Posts from docs
    const postFiles = await fg('docs/*.md');
    for (const file of postFiles) {
      const raw = await fs.readFile(file, 'utf8');
      const lines = raw.split('\n');
      let title = path.basename(file, '.md');
      for (const line of lines) {
        if (line.startsWith('# ')) {
          title = line.replace(/^#\s+/, '');
          break;
        }
      }
      index.push({
        type: 'post',
        title,
        url: `https://github.com/undisclosed/kali-linux-portfolio/blob/main/${file}`,
        content: raw.slice(0, 200)
      });
    }

    // Pages
    const pageFiles = await fg(['pages/**/*.{js,jsx,ts,tsx}', '!pages/{_*,api/**}']);
    for (const file of pageFiles) {
      const rel = file
        .replace(/^pages/, '')
        .replace(/\/index\.(jsx|tsx|js|ts)$/i, '')
        .replace(/\.(jsx|tsx|js|ts)$/i, '');
      const url = rel === '' ? '/' : rel;
      const content = await fs.readFile(file, 'utf8');
      const title = path.basename(file).replace(/\.(jsx|tsx|js|ts)$/i, '');
      index.push({
        type: 'page',
        title,
        url,
        content: content.slice(0, 200)
      });
    }

    await fs.mkdir('public/search', { recursive: true });
    await fs.writeFile('public/search/index.json', JSON.stringify(index, null, 2));
    console.log(`Generated search index with ${index.length} entries.`);
  } catch (err) {
    console.error('Search index generation failed:', err);
    process.exit(1);
  }
}

generate();
