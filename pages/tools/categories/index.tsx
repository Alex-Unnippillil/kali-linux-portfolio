import Link from 'next/link';
import categories from '@/data/tool-categories';
import CategoryLayout from '@/components/tools/CategoryLayout';

export default function ToolCategoriesIndex() {
  return (
    <CategoryLayout className="space-y-4">
      <h1 className="text-2xl font-bold">Tool Categories</h1>
      <ul className="list-disc list-inside space-y-2">
        {categories.map((cat) => (
          <li key={cat.id}>
            <Link href={`/tools/${cat.id}`} className="text-blue-600 underline">
              {cat.name}
            </Link>
          </li>
        ))}
      </ul>
    </CategoryLayout>
  );
}
