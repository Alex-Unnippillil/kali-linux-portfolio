import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Link from 'next/link';

interface ProjectMeta {
  slug: string;
  title: string;
}

interface IndexProps {
  projects: ProjectMeta[];
}

export default function ProjectsIndex({ projects }: IndexProps) {
  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Projects</h1>
      <ul className="list-disc pl-5">
        {projects.map((p) => (
          <li key={p.slug}>
            <Link href={`/projects/${p.slug}`}>{p.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function getStaticProps() {
  const projectsDir = path.join(process.cwd(), 'content/projects');
  const files = fs.readdirSync(projectsDir);
  const projects = files.map((file) => {
    const slug = file.replace(/\.mdx?$/, '');
    const source = fs.readFileSync(path.join(projectsDir, file), 'utf8');
    const { data } = matter(source);
    return { slug, title: data.title || slug };
  });
  return { props: { projects } };
}
