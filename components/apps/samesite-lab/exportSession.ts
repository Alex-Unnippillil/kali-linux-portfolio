export type SameSiteMode = 'Strict' | 'Lax' | 'None';

export interface SessionHeaders {
  Origin: string;
  Referer: string;
  Cookie: string;
}

export interface SubmissionOutcome {
  attempt: number;
  mode: SameSiteMode;
  originChecked: boolean;
  refererChecked: boolean;
  success: boolean;
  reasons: string[];
  message: string;
  timestamp: string;
}

export interface SessionState {
  mode: SameSiteMode;
  originChecked: boolean;
  refererChecked: boolean;
  headers: SessionHeaders;
  submissions: SubmissionOutcome[];
}

export type DownloadHandler = (content: string, filename: string) => void;

export const SESSION_FILENAME = 'same-site-session.txt';

export const buildSessionReport = (session: SessionState): string => {
  const headerLines = [`SameSite Mode: ${session.mode}`];
  headerLines.push(`Origin Check: ${session.originChecked ? 'Enabled' : 'Disabled'}`);
  headerLines.push(
    `Referer Check: ${session.refererChecked ? 'Enabled' : 'Disabled'}`,
  );

  const headerSnapshot = Object.entries(session.headers)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

  const outcomeLines = session.submissions.length
    ? session.submissions
        .map((entry) => {
          const status = entry.success ? 'ACCEPTED' : 'REJECTED';
          const detail = entry.success
            ? 'Cookies delivered successfully.'
            : entry.reasons.join(' ');
          return `#${entry.attempt} ${status}: ${detail}`;
        })
        .join('\n')
    : 'No submissions recorded.';

  return [
    'SameSite Lab Session Report',
    headerLines.join('\n'),
    '',
    'Simulated Headers:',
    headerSnapshot,
    '',
    'Outcomes:',
    outcomeLines,
    '',
  ].join('\n');
};

const defaultDownload: DownloadHandler = (content, filename) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  try {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export session', error);
    throw error;
  }
};

export const exportSessionReport = (
  session: SessionState,
  download: DownloadHandler = defaultDownload,
): boolean => {
  const report = buildSessionReport(session);
  download(report, SESSION_FILENAME);
  return true;
};
