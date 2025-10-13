import type { FC } from 'react';

interface VersionBannerProps {
  requestedVersionId: string;
  requestedVersionLabel: string;
  resolvedVersionId: string;
  resolvedVersionLabel: string;
  latestVersionId: string;
  latestVersionLabel: string;
  fallbackVersionId?: string;
  isAliasRequest?: boolean;
}

const emphasisClass = 'font-semibold';

const VersionBanner: FC<VersionBannerProps> = ({
  requestedVersionId,
  requestedVersionLabel,
  resolvedVersionId,
  resolvedVersionLabel,
  latestVersionId,
  latestVersionLabel,
  fallbackVersionId,
  isAliasRequest,
}) => {
  const isViewingLatest = resolvedVersionId === latestVersionId;
  const requestedMatchesLatest =
    requestedVersionId === latestVersionId || requestedVersionId === 'latest';

  if (isViewingLatest && !fallbackVersionId && requestedMatchesLatest) {
    return null;
  }

  let message: string;

  if (fallbackVersionId) {
    message = `This page is not available in ${requestedVersionLabel}. Showing ${resolvedVersionLabel} (current) instead.`;
  } else if (isViewingLatest && !requestedMatchesLatest && !isAliasRequest) {
    message = `Redirected to ${resolvedVersionLabel} because it is the most recent documentation.`;
  } else if (!isViewingLatest) {
    message = `You are viewing ${resolvedVersionLabel}. The latest documentation is ${latestVersionLabel}.`;
  } else {
    return null;
  }

  return (
    <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
      <p>
        <span className={emphasisClass}>{message}</span>
        {!fallbackVersionId && !isViewingLatest && (
          <>
            {' '}Consider switching to <span className={emphasisClass}>{latestVersionLabel}</span> for the most up-to-date
            guidance.
          </>
        )}
      </p>
    </div>
  );
};

export default VersionBanner;
