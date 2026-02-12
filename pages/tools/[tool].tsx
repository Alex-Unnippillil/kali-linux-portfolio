import { useRouter } from 'next/router';
import type { Tool } from '../../types/tool';
import toolsData from '../../data/tools.json';

const slugify = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

const tools = toolsData as Tool[];

const ToolDetail = () => {
  const router = useRouter();
  const { tool } = router.query;

  if (typeof tool !== 'string') {
    return null;
  }

  const data = tools.find(t => slugify(t.name) === tool);

  if (!data) {
    return <div className="p-4">Tool not found.</div>;
  }

  return (
    <div className="p-4">
      <h1 className="mb-2 text-xl font-bold">{data.name}</h1>
      <p className="mb-4">{data.short}</p>
      <h2 className="font-semibold">Packages</h2>
      <ul className="mb-4 list-disc list-inside">
        {data.packages.map(pkg => (
          <li key={pkg}>{pkg}</li>
        ))}
      </ul>
      <h2 className="font-semibold">Commands</h2>
      <ul className="mb-4 list-disc list-inside">
        {data.commands.map((cmd, i) => (
          <li key={i}>
            <code>{cmd}</code>
          </li>
        ))}
      </ul>
      <h2 className="font-semibold">Links</h2>
      <ul className="list-disc list-inside">
        {data.links.map((url, i) => (
          <li key={i}>
            <a href={url} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">
              {url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ToolDetail;
