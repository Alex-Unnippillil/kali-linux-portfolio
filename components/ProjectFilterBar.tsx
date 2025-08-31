import { useRouter } from 'next/router';

interface ProjectFilterBarProps {
  tags: string[];
  domains: string[];
}

function parseParam(param: string | string[] | undefined): string[] {
  if (typeof param !== 'string' || !param) return [];
  return param.split(',').filter(Boolean);
}

export default function ProjectFilterBar({ tags, domains }: ProjectFilterBarProps) {
  const router = useRouter();
  const selectedTags = parseParam(router.query.tags);
  const selectedDomains = parseParam(router.query.domains);
  const sort = typeof router.query.sort === 'string' ? router.query.sort : 'recency';

  const updateQuery = (next: Record<string, string>) => {
    const query = { ...router.query, ...next } as Record<string, any>;
    Object.keys(query).forEach((key) => {
      if (!query[key]) delete query[key];
    });
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  };

  const toggle = (key: 'tags' | 'domains', value: string, current: string[]) => {
    const exists = current.includes(value);
    const next = exists ? current.filter((v) => v !== value) : [...current, value];
    updateQuery({ [key]: next.join(',') });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => toggle('tags', t, selectedTags)}
            className={`px-3 py-1 rounded-full border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 ${
              selectedTags.includes(t) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {domains.map((d) => (
          <button
            key={d}
            onClick={() => toggle('domains', d, selectedDomains)}
            className={`px-3 py-1 rounded-full border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 ${
              selectedDomains.includes(d) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'
            }`}
          >
            {d}
          </button>
        ))}
      </div>
      <div>
        <select
          aria-label="Sort"
          value={sort}
          onChange={(e) => updateQuery({ sort: e.target.value })}
          className="px-2 py-1 border rounded text-black"
        >
          <option value="recency">Recency</option>
          <option value="impact">Impact</option>
          <option value="complexity">Complexity</option>
        </select>
      </div>
    </div>
  );
}
