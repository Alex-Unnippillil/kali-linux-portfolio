import tools from '../../data/tools.json';

const ToolsPage = () => (
  <div className="p-4">
    <table className="min-w-full text-sm">
      <thead>
        <tr className="text-left">
          <th className="p-1">Name</th>
          <th className="p-1">Package</th>
          <th className="p-1">Command</th>
        </tr>
      </thead>
      <tbody>
        {tools.map((tool) => (
          <tr key={tool.name} className="border-t">
            <td className="p-1">{tool.name}</td>
            <td className="p-1">
              <span className="rounded bg-gray-200 px-2 py-0.5">{tool.package}</span>
            </td>
            <td className="p-1">
              <span className="rounded bg-gray-200 px-2 py-0.5 font-mono">{tool.command}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default ToolsPage;
