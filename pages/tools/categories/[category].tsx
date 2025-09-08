import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import categories, { ToolCategory } from '../../../data/tool-categories';
import toolData from '../../../data/tools.json';
import Hero from '../../../components/ui/Hero';
import CommandChip from '../../../components/ui/CommandChip';
import ToolCard from '../../../components/tools/ToolCard';

interface ToolInfo {
  id: string;
  name: string;
  install: string;
}

interface CategoryPageProps {
  category: ToolCategory;
  tools: ToolInfo[];
}

export default function CategoryPage({ category, tools }: CategoryPageProps) {
  return (
    <div className="p-4 space-y-6">
      <Hero title={category.name} summary={[category.intro]} />
      <section>
        <h2 className="text-xl font-semibold mb-4">Popular Tools</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <li key={tool.id}>
              <ToolCard name={tool.name} category={category.id}>
                {tool.install && <CommandChip command={tool.install} />}
              </ToolCard>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: categories.map((c) => ({ params: { category: c.id } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<CategoryPageProps> = async ({ params }) => {
  const id = params?.category as string;
  const category = categories.find((c) => c.id === id)!;
  const tools: ToolInfo[] = category.tools.map((tid) => {
    const t = (toolData as any[]).find((tool) => tool.id === tid);
    const install = t?.commands?.find((c: any) => c.label === 'Install')?.cmd || '';
    return { id: tid, name: t?.name || tid, install };
  });
  return { props: { category, tools } };
};
