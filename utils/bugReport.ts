export interface BugReportOptions {
  errorId: string;
  appId?: string | null;
  appTitle?: string | null;
  context?: string | null;
  currentUrl?: string | null;
  additionalDetails?: string | null;
}

export function buildBugReportURL({
  errorId,
  appId,
  appTitle,
  context,
  currentUrl,
  additionalDetails,
}: BugReportOptions): string {
  const params = new URLSearchParams();
  params.set('preset', 'bug-report');
  params.set('errorId', errorId);

  if (appTitle) {
    params.set('title', `${appTitle} bug report`);
    params.set('appTitle', appTitle);
  } else {
    params.set('title', 'Bug report');
  }

  if (appId) {
    params.set('appId', appId);
  }

  if (context) {
    params.set('context', context);
  }

  if (currentUrl) {
    params.set('url', currentUrl);
  }

  const lines: string[] = [];
  if (appTitle) {
    lines.push(`App: ${appTitle}`);
  }
  if (context) {
    lines.push(`Context: ${context}`);
  }
  if (appId) {
    lines.push(`App ID: ${appId}`);
  }
  if (additionalDetails) {
    lines.push(additionalDetails);
  }

  if (lines.length) {
    params.set('text', lines.join('\n'));
  }

  return `/input-hub?${params.toString()}`;
}

