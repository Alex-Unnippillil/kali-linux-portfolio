import Link from 'next/link';
import toolsData from '../../data/tools.json';
import categories from '../../data/tool-categories';

interface Tool {
  id: string;
  name: string;
  summary: string;
  related?: string[];
}

interface RelatedToolsProps {
  toolId: string;
}

const tools = toolsData as Tool[];

function getRelatedTools(id: string): Tool[] {
  const tool = tools.find((t) => t.id === id);
  if (!tool) return [];

  if (tool.related && tool.related.length > 0) {
    return tools.filter((t) => tool.related!.includes(t.id));
  }

  const category = categories.find((c) => c.tools.includes(id));
  if (!category) return [];

  return tools.filter((t) => t.id !== id && category.tools.includes(t.id));
}

export default function RelatedTools({ toolId }: RelatedToolsProps) {
  const related = getRelatedTools(toolId);
  if (related.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold mb-4">Related Tools</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {related.map((tool) => (
          <Link
            key={tool.id}
            href={`/tools/${tool.id}`}
            className="block border rounded p-4 hover:bg-gray-50 focus:outline-none"
          >
            <h3 className="font-bold mb-2">{tool.name}</h3>
            <p className="text-sm text-gray-700">{tool.summary}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

