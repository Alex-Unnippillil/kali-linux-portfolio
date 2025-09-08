import { GetStaticPaths, GetStaticProps } from 'next';
import categories, { ToolCategory } from '@/data/tool-categories';
import toolData from '@/data/tools.json';
import Hero from '@/components/ui/Hero';
import ToolCard from '@/components/tools/ToolCard';
import CategoryLayout from '@/components/tools/CategoryLayout';

interface ToolInfo {
  id: string;
  name: string;
}

interface CategoryPageProps {
  category: ToolCategory;
  tools: ToolInfo[];
}

export default function CategoryPage({ category, tools }: CategoryPageProps) {
  return (
    <CategoryLayout>
      <Hero title={category.name} summary={[category.intro]} />
      <section>
        <h2 className="text-xl font-semibold mb-4">Popular Tools</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <li key={tool.id}>
              <ToolCard id={tool.id} name={tool.name} href={`/tools/${tool.id}`} />
            </li>
          ))}
        </ul>
      </section>
    </CategoryLayout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: categories.map((c) => ({ params: { category: c.id } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<CategoryPageProps> = async ({ params }) => {
  const id = params?.category as string;
  const category = categories.find((c) => c.id === id)!;
  const tools: ToolInfo[] = category.tools.map((tid) => {
    const t = (toolData as any[]).find((tool) => tool.id === tid);
    return { id: tid, name: t?.name || tid };
  });
  return { props: { category, tools } };
};

