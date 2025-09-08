import CommandChip from '@/components/CommandChip';
import toolData from '@/data/tool-details.json';
import { GetStaticPaths, GetStaticProps } from 'next';

interface LinkInfo {
  label: string;
  url: string;
}

interface ToolInfo {
  name: string;
  description: string;
  commands: string[];
  links: LinkInfo[];
}

interface ToolPageProps {
  tool: ToolInfo;
}

export default function ToolPage({ tool }: ToolPageProps) {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">{tool.name}</h1>
      <p>{tool.description}</p>
      {tool.commands.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-2">Commands</h2>
          <div className="flex flex-wrap gap-2">
            {tool.commands.map((cmd) => (
              <CommandChip key={cmd} command={cmd} />
            ))}
          </div>
        </section>
      )}
      {tool.links.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-2">External Links</h2>
          <ul className="list-disc list-inside">
            {tool.links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

const tools: Record<string, ToolInfo> = toolData as Record<string, ToolInfo>;

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: Object.keys(tools).map((id) => ({ params: { tool: id } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<ToolPageProps> = async ({ params }) => {
  const id = params?.tool as string;
  const tool = tools[id];
  return { props: { tool } };
};
