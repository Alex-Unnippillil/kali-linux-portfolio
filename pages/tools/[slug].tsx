import Link from 'next/link';
import { GetStaticPaths, GetStaticProps } from 'next';
import tools from '../../data/tools.json';
import copyToClipboard from '../../utils/clipboard';
import CategoryBadge from '../../components/CategoryBadge';

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
  categories?: string[];
  packages: ToolPackage[];
  commands: ToolCommand[];
  upstream: string;
  related?: string[];
}

interface Props {
  tool: Tool;
}

export default function ToolPage({ tool }: Props) {
  const handleCopy = (cmd: string) => {
    copyToClipboard(cmd);
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{tool.name}</h1>
      {tool.categories && (
        <div className="mb-4 flex flex-wrap gap-2">
          {tool.categories.map((cat) => (
            <CategoryBadge key={cat} category={cat} />
          ))}
        </div>
      )}
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
          <ul className="space-y-2">
            {tool.commands.map((c, i) => (
              <li key={i} className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 text-sm">
                  {c.cmd}
                </code>
                <button
                  onClick={() => handleCopy(c.cmd)}
                  className="px-2 py-1 text-sm border rounded"
                >
                  Copy
                </button>
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

      {tool.related && tool.related.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Related Tools</h2>
          <ul className="list-disc list-inside">
            {tool.related.map((slug) => {
              const relatedTool = tools.find((t) => t.id === slug);
              return (
                <li key={slug}>
                  <Link href={`/tools/${slug}`}>{relatedTool?.name || slug}</Link>
                </li>
              );
            })}
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

