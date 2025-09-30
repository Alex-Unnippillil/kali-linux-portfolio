import Head from 'next/head';
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';

import {
  getFeatureFlagMetadata,
  type FeatureFlagMetadata,
} from '../../lib/featureFlags';

type FlagsPageProps = {
  flags: FeatureFlagMetadata[];
  guard: 'development' | 'key';
};

function resolveFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export const getServerSideProps: GetServerSideProps<FlagsPageProps> = async (
  context,
) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  let guard: FlagsPageProps['guard'] = 'development';

  if (!isDevelopment) {
    const configuredKey = process.env.ADMIN_READ_KEY;
    const headerKey = context.req.headers['x-admin-key'];
    const header = Array.isArray(headerKey) ? headerKey[0] : headerKey;
    const queryKey = resolveFirst(context.query.key);
    const providedKey = header ?? queryKey;

    if (!configuredKey || providedKey !== configuredKey) {
      return { notFound: true };
    }

    guard = 'key';
  }

  return {
    props: {
      flags: getFeatureFlagMetadata(),
      guard,
    },
  };
};

function StatusBadge({ enabled }: { enabled: boolean }) {
  const label = enabled ? 'Enabled' : 'Disabled';
  const tone = enabled ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300';
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${tone}`}
    >
      {label}
    </span>
  );
}

export default function FeatureFlagDashboard(
  props: InferGetServerSidePropsType<typeof getServerSideProps>,
) {
  const { flags, guard } = props;

  return (
    <>
      <Head>
        <title>Feature flag dashboard</title>
      </Head>
      <main className="space-y-6 p-6 text-sm text-gray-100">
        <header className="space-y-2">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-purple-300">
              Admin utilities
            </p>
            <h1 className="text-3xl font-semibold">Feature flags</h1>
          </div>
          <p className="max-w-2xl text-gray-400">
            Review runtime flag values pulled from environment variables. Access is
            limited to{' '}
            {guard === 'development'
              ? 'local and preview builds'
              : 'sessions with a valid ADMIN_READ_KEY'}
            . Rollouts display the configured override or fall back to 100% when a
            flag is enabled.
          </p>
        </header>
        <section className="overflow-x-auto rounded-lg border border-purple-500/30 bg-black/40 shadow-lg">
          <table className="min-w-full divide-y divide-purple-500/40">
            <thead className="bg-purple-950/40 text-left text-xs uppercase tracking-wider text-purple-200">
              <tr>
                <th scope="col" className="px-4 py-3">Flag</th>
                <th scope="col" className="px-4 py-3">Description</th>
                <th scope="col" className="px-4 py-3">Environment</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Rollout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/20">
              {flags.map((flag) => {
                const rolloutValue = Number.isInteger(flag.rolloutPercentage)
                  ? flag.rolloutPercentage.toString()
                  : flag.rolloutPercentage.toFixed(1);

                return (
                  <tr key={flag.key} className="bg-black/40 hover:bg-purple-900/20">
                    <td className="px-4 py-4 align-top font-mono text-xs sm:text-sm">
                      <div className="font-semibold text-purple-200">{flag.name}</div>
                      <div className="text-gray-400">{flag.key}</div>
                      {flag.docsUrl && (
                        <div className="pt-1 text-[11px] text-purple-300">
                          <a
                            href={`/${flag.docsUrl}`}
                            className="underline hover:text-purple-200"
                          >
                            Docs
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p>{flag.description}</p>
                      {flag.notes && (
                        <p className="pt-2 text-xs text-amber-300">{flag.notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top capitalize">{flag.environment}</td>
                    <td className="px-4 py-4 align-top">
                      <StatusBadge enabled={flag.enabled} />
                      <div className="pt-1 text-xs text-gray-400">
                        {flag.source === 'environment'
                          ? `Defined via ${flag.key}`
                          : 'Using default value'}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">{rolloutValue}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
