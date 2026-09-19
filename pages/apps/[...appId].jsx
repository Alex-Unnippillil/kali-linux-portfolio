import apps from '../../apps.config';

const appById = new Map(apps.map((app) => [app.id, app]));

const collectExplicitAppRoutes = (fs, path, dir, prefix = '') => {
  if (!fs.existsSync(dir)) return new Set();

  return fs.readdirSync(dir, { withFileTypes: true }).reduce((routes, entry) => {
    if (entry.name.startsWith('[') || entry.name === 'index.jsx') return routes;

    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectExplicitAppRoutes(fs, path, entryPath, `${prefix}${entry.name}/`).forEach((route) => routes.add(route));
      return routes;
    }

    if (/\.(jsx|tsx|js|ts)$/.test(entry.name)) {
      routes.add(`${prefix}${entry.name.replace(/\.(jsx|tsx|js|ts)$/, '')}`);
    }

    return routes;
  }, new Set());
};

export function getStaticPaths() {
  const fs = require('fs');
  const path = require('path');
  const explicitRoutes = collectExplicitAppRoutes(fs, path, path.join(process.cwd(), 'pages/apps'));
  const paths = apps
    .filter((app) => !app.disabled && !app.isFolder && !explicitRoutes.has(app.id))
    .map((app) => ({ params: { appId: app.id.split('/') } }));

  return {
    paths,
    fallback: false,
  };
}

export function getStaticProps({ params }) {
  return {
    props: {
      appId: (params?.appId || []).join('/'),
    },
  };
}

export default function RegistryAppPage({ appId }) {
  const app = appById.get(appId);

  if (!app?.screen) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ub-cool-grey p-6 text-white">
        <div className="max-w-md rounded-lg border border-white/10 bg-black/30 p-6 text-center shadow-2xl">
          <h1 className="text-xl font-semibold">App unavailable</h1>
          <p className="mt-2 text-sm text-gray-200">
            This launcher entry does not have a standalone preview route yet.
          </p>
        </div>
      </main>
    );
  }

  const AppScreen = app.screen;
  return <AppScreen />;
}
