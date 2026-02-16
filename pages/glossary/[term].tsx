import Link from 'next/link';
import { buildGlossaryGraph } from '@/src/lib/glossary/graph';
import { GLOSSARY } from '@/data/glossary';

const PAGE_SIZE = 10;

export interface TermPageProps {
  term: string;
  page?: number;
}

/**
 * Page component for an individual glossary term. Displays other terms that
 * reference the current one. Results are paginated when the list exceeds
 * the page size.
 */
export default function TermPage({ term, page = 1 }: TermPageProps) {
  const graph = buildGlossaryGraph(GLOSSARY);
  const references = graph.references[term] || [];
  const start = (page - 1) * PAGE_SIZE;
  const paginated = references.slice(start, start + PAGE_SIZE);
  const totalPages = Math.ceil(references.length / PAGE_SIZE);

  return (
    <div>
      <h1>{term}</h1>
      <ul>
        {paginated.map((name) => (
          <li key={name}>
            <Link href={`/glossary/${name}`}>{name}</Link>
          </li>
        ))}
      </ul>
      {totalPages > 1 && (
        <nav>
          {Array.from({ length: totalPages }, (_, i) => (
            <Link key={i} href={`/glossary/${term}?page=${i + 1}`}>
              {i + 1}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
