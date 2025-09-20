import { Suspense } from 'react';
import BetaBadge from '@/components/BetaBadge';
import InstallButton from '@/components/InstallButton';
import Ubuntu from '@/components/ubuntu';
import BetaBadgeSkeleton from '@/components/shells/BetaBadgeSkeleton';
import DesktopShellSkeleton from '@/components/shells/DesktopShellSkeleton';
import InstallButtonSkeleton from '@/components/shells/InstallButtonSkeleton';

export default function HomePage() {
  return (
    <>
      <a href="#window-area" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <Suspense fallback={<DesktopShellSkeleton />}>
        <Ubuntu />
      </Suspense>
      <Suspense fallback={<BetaBadgeSkeleton />}>
        <BetaBadge />
      </Suspense>
      <Suspense fallback={<InstallButtonSkeleton />}>
        <InstallButton />
      </Suspense>
    </>
  );
}
