import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ErrorScreen from '../../components/common/ErrorScreen';
import { createLogger } from '../../lib/logger';

const AppsPage = () => {
  const [apps, setApps] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);
  const [retryToken, setRetryToken] = useState(0);
  const loggerRef = useRef(createLogger());

  useEffect(() => {
    let isMounted = true;
    import('../../apps.config')
      .then((mod) => {
        if (!isMounted) return;
        setApps(mod.default);
        setError(null);
      })
      .catch((err) => {
        loggerRef.current.error('Failed to load app catalog', { error: err });
        if (!isMounted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      });
    return () => {
      isMounted = false;
    };
  }, [retryToken]);

  const filteredApps = apps.filter(
    (app) => !app.disabled && app.title.toLowerCase().includes(query.toLowerCase()),
  );

  if (error) {
    const code = [error.message, error.stack].filter(Boolean).join('\n\n');
    return (
      <div className="min-h-screen bg-slate-900">
        <ErrorScreen
          title="Unable to load apps"
          message="The application catalog failed to load. Retry to fetch it again or review the troubleshooting guide for manual fixes."
          code={code}
          onRetry={() => {
            setError(null);
            setApps([]);
            setRetryToken((token) => token + 1);
          }}
          logHref="/docs/troubleshooting#app-catalog"
        />
      </div>
    );
  }

  return (
    <div className="p-4">
      <label htmlFor="app-search" className="sr-only">
        Search apps
      </label>
      <input
        id="app-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search apps"
        className="mb-4 w-full rounded border p-2"
      />
      <div
        id="app-grid"
        tabIndex="-1"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {filteredApps.map((app) => (
          <Link
            key={app.id}
            href={`/apps/${app.id}`}
            className="flex flex-col items-center rounded border p-4 text-center focus:outline-none focus:ring"
            aria-label={app.title}
          >
            {app.icon && (
              <Image
                src={app.icon}
                alt=""
                width={64}
                height={64}
                sizes="64px"
                className="h-16 w-16"
              />
            )}
            <span className="mt-2">{app.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AppsPage;

