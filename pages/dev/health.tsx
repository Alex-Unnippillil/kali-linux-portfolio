import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import apps from '../../apps.config';

interface HealthInfo {
  id: string;
  title: string;
  loadTime: number | null;
  error: string | null;
  iconMissing: boolean;
}

interface Props {
  panelPlugins: string[];
  catalogPlugins: string[];
}

const HealthPage: React.FC<Props> = ({ panelPlugins, catalogPlugins }) => {
  const [health, setHealth] = useState<HealthInfo[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const results: HealthInfo[] = [];
      for (const app of apps as any[]) {
        const result: HealthInfo = {
          id: app.id,
          title: app.title,
          loadTime: null,
          error: null,
          iconMissing: false,
        };
        if (app.icon) {
          try {
            const resp = await fetch(app.icon);
            result.iconMissing = !resp.ok;
          } catch {
            result.iconMissing = true;
          }
        } else {
          result.iconMissing = true;
        }
        const start = performance.now();
        try {
          // Dynamic import similar to createDynamicApp
          const mod: any = await import(`../../components/apps/${app.id}`);
          result.loadTime = Math.round(performance.now() - start);
          try {
            const container = document.createElement('div');
            const root = createRoot(container);
            root.render(React.createElement(mod.default));
            root.unmount();
            container.remove();
          } catch (e: any) {
            result.error = e.message || String(e);
          }
        } catch (e: any) {
          result.error = e.message || String(e);
        }
        results.push(result);
        if (!cancelled) setHealth([...results]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-4 space-y-8">
      <div>
        <h1 className="text-2xl mb-4">App Health</h1>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="border-b p-2">App</th>
              <th className="border-b p-2">Load Time (ms)</th>
              <th className="border-b p-2">Error</th>
              <th className="border-b p-2">Icon Missing</th>
            </tr>
          </thead>
          <tbody>
            {health.map((h) => (
              <tr key={h.id} className="border-b">
                <td className="p-2">{h.title}</td>
                <td className="p-2">{h.loadTime ?? '-'}</td>
                <td className="p-2 text-red-500">{h.error ?? ''}</td>
                <td className="p-2">{h.iconMissing ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h2 className="text-xl mb-2">Panel Plugins</h2>
        <ul className="list-disc ml-5">
          {panelPlugins.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="text-xl mb-2">Plugin Catalog</h2>
        <ul className="list-disc ml-5">
          {catalogPlugins.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export async function getStaticProps() {
  const fs = await import('fs');
  const path = await import('path');
  const panelDir = path.join(process.cwd(), 'plugins', 'panel');
  const catalogDir = path.join(process.cwd(), 'plugins', 'catalog');
  const panelPlugins = fs.existsSync(panelDir)
    ? fs.readdirSync(panelDir).filter((f) => f.endsWith('.json'))
    : [];
  const catalogPlugins = fs.existsSync(catalogDir)
    ? fs.readdirSync(catalogDir).filter((f) => f.endsWith('.json'))
    : [];
  return { props: { panelPlugins, catalogPlugins } };
}

export default HealthPage;
