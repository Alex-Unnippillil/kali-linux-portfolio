import { getCategoryStyle } from '@/data/categoryColors';

export interface ToolTableRow {
  id: string;
  name: string;
  category: string;
}

interface ToolTableProps {
  tools: ToolTableRow[];
}

export default function ToolTable({ tools }: ToolTableProps) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="p-2 text-left">Tool</th>
          <th className="p-2 text-left">Category</th>
        </tr>
      </thead>
      <tbody>
        {tools.map((tool) => (
          <tr key={tool.id} style={getCategoryStyle(tool.category)}>
            <td className="p-2 font-medium">{tool.name}</td>
            <td className="p-2">{tool.category}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
