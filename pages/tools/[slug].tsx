import Link from 'next/link';
import { GetStaticPaths, GetStaticProps } from 'next';
import tools from '../../data/tools.json';
import CommandChip from '@/components/CommandChip';

interface ToolCommand {
  label?: string;
  cmd: string;
}

interface ToolPackage {
  name: string;
  version?: string;
}

interface Tool {
  id: string;
  name: string;
  summary: string;
  packages: ToolPackage[];
  commands: ToolCommand[];
  upstream: string;
  related?: string[];
}

interface Props {
  tool: Tool;
}

export default function ToolPage({ tool }: Props) {
  const relatedTools = (tool.related ?? [])
    .map((slug) => tools.find((t) => t.id === slug))
    .filter((t): t is Tool => Boolean(t))
    .slice(0, 6);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{tool.name}</h1>
      <p className="mb-6">{tool.summary}</p>

      {tool.packages?.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Packages</h2>
          <ul className="list-disc list-inside">
            {tool.packages.map((pkg) => (
              <li key={pkg.name}>
                {pkg.name}
                {pkg.version ? ` ${pkg.version}` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tool.commands?.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Commands</h2>
          <ul className="flex flex-wrap gap-2">
            {tool.commands.map((c, i) => (
              <li key={i}>
                <CommandChip command={c.cmd} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {tool.upstream && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Upstream</h2>
          <a
            href={tool.upstream}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            {tool.upstream}
          </a>
        </section>
      )}

      {relatedTools.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Related Tools</h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {relatedTools.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tools/${t.id}`}
                  className="block rounded border p-4 focus:outline-none focus:ring"
                >
                  <h3 className="font-semibold text-base sm:text-lg">{t.name}</h3>
                  <p className="mt-2 text-sm line-clamp-1">{t.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: tools.map((tool) => ({ params: { slug: tool.id } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const slug = params?.slug as string;
  const tool = tools.find((t) => t.id === slug)!;
  return { props: { tool } };
};

