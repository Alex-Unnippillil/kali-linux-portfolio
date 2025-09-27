import { Suspense, type ComponentType, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import AppSuspenseFallback from '../components/ui/AppSuspenseFallback';

type Loader<TProps> = () => Promise<{ default: ComponentType<TProps> }>;

type Options<TProps> = {
  appName?: string;
  fallback?: ReactNode;
  ssr?: boolean;
};

const createSuspenseAppPage = <TProps extends Record<string, unknown> = Record<string, never>>(
  loader: Loader<TProps>,
  options: Options<TProps> = {},
) => {
  const { appName, fallback, ssr = false } = options;

  const DynamicComponent = dynamic(loader, {
    ssr,
    suspense: true,
  });

  const Page = (props: TProps) => (
    <Suspense fallback={fallback ?? <AppSuspenseFallback appName={appName} />}>
      <DynamicComponent {...props} />
    </Suspense>
  );

  Page.displayName = appName ? `${appName}SuspensePage` : 'SuspenseAppPage';

  return Page;
};

export default createSuspenseAppPage;
