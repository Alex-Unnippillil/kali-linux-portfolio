import { createLogger } from '../lib/logger';

type FileLike = {
  name?: string;
  type?: string;
  size?: number;
  lastModified?: number;
};

export interface FileRiskAssessment {
  isRisky: boolean;
  reasons: string[];
  matchedExtension?: string;
  matchedMimeType?: string;
}

const EXTENSION_REASONS: Record<string, string> = {
  '.exe': 'Windows executable files can run programs on your system.',
  '.msi': 'Windows installer packages can modify your system.',
  '.bat': 'Batch scripts can execute arbitrary commands.',
  '.cmd': 'Command scripts can execute arbitrary commands.',
  '.ps1': 'PowerShell scripts can execute administrative commands.',
  '.psm1': 'PowerShell modules can contain executable scripts.',
  '.vbs': 'VBScript files can execute code through Windows Script Host.',
  '.js': 'JavaScript files can execute code locally.',
  '.jse': 'Encoded JScript files can execute code through Windows Script Host.',
  '.wsf': 'Windows script files can execute code with multiple engines.',
  '.scr': 'Screensaver files are executable binaries.',
  '.dll': 'Dynamic link libraries may contain executable code.',
  '.sh': 'Shell scripts can run commands on Unix-like systems.',
  '.bash': 'Bash scripts can run commands on Unix-like systems.',
  '.zsh': 'Z shell scripts can run commands on Unix-like systems.',
  '.fish': 'Fish shell scripts can run commands on Unix-like systems.',
  '.run': 'Run packages can install or execute software.',
  '.bin': 'Binary files may contain executable code.',
  '.php': 'PHP scripts can execute server-side code.',
  '.py': 'Python scripts can execute arbitrary code.',
  '.rb': 'Ruby scripts can execute arbitrary code.',
  '.pl': 'Perl scripts can execute arbitrary code.',
  '.jar': 'Java archives can contain executable Java code.',
  '.apk': 'Android packages can install applications.',
  '.app': 'macOS application bundles can contain executable code.',
  '.pkg': 'Installer packages can modify your system.',
  '.deb': 'Debian packages can install software.',
  '.rpm': 'RPM packages can install software.',
  '.psd1': 'PowerShell data files can define script modules.',
};

const MIME_REASONS: Record<string, string> = {
  'application/x-msdownload': 'Windows executable content detected by MIME type.',
  'application/x-msdos-program': 'Windows executable content detected by MIME type.',
  'application/vnd.microsoft.portable-executable': 'Portable executable binary detected.',
  'application/x-dosexec': 'DOS/Windows executable binary detected.',
  'application/x-executable': 'Generic executable binary detected.',
  'application/x-mach-binary': 'macOS executable binary detected.',
  'application/x-elf': 'ELF executable binary detected.',
  'application/x-sh': 'Shell script MIME type detected.',
  'application/x-shellscript': 'Shell script MIME type detected.',
  'text/x-shellscript': 'Shell script MIME type detected.',
  'application/x-bat': 'Batch script MIME type detected.',
  'application/x-msbatch': 'Batch script MIME type detected.',
  'application/x-msi': 'Installer package MIME type detected.',
  'application/x-powershell': 'PowerShell script MIME type detected.',
  'text/x-powershell': 'PowerShell script MIME type detected.',
  'application/x-java-archive': 'Java archive MIME type detected.',
  'application/java-archive': 'Java archive MIME type detected.',
  'application/x-ms-shortcut': 'Windows shortcut MIME type detected.',
};

const RISKY_EXTENSION_LIST = new Set(Object.keys(EXTENSION_REASONS));
const RISKY_MIME_LIST = new Set(Object.keys(MIME_REASONS));

function normalizeExtension(name?: string): string | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase();
  const dotIndex = lower.lastIndexOf('.');
  if (dotIndex === -1) return undefined;
  return lower.slice(dotIndex);
}

function fingerprintFile(file: FileLike): string {
  const name = (file.name ?? '').toLowerCase();
  const size = typeof file.size === 'number' ? file.size : 'unknown';
  const lastModified = typeof file.lastModified === 'number' ? file.lastModified : 'unknown';
  return `${name}:${size}:${lastModified}`;
}

export function assessFileSafety(file: FileLike): FileRiskAssessment {
  const reasons: string[] = [];
  const extension = normalizeExtension(file.name);
  let matchedExtension: string | undefined;
  if (extension && RISKY_EXTENSION_LIST.has(extension)) {
    reasons.push(EXTENSION_REASONS[extension]);
    matchedExtension = extension;
  }

  const type = file.type?.toLowerCase();
  let matchedMimeType: string | undefined;
  if (type && RISKY_MIME_LIST.has(type)) {
    reasons.push(MIME_REASONS[type]);
    matchedMimeType = type;
  }

  return {
    isRisky: reasons.length > 0,
    reasons,
    matchedExtension,
    matchedMimeType,
  };
}

export type FileSafetyDecision = 'proceed' | 'cancel';

interface RecordDecisionOptions {
  risk: FileRiskAssessment;
  meta?: Record<string, unknown>;
}

interface FileSafetySessionOptions {
  context?: string;
}

interface FileSafetySession {
  hasConsent(file: FileLike): boolean;
  recordDecision(file: FileLike, decision: FileSafetyDecision, options: RecordDecisionOptions): void;
}

export function createFileSafetySession(options: FileSafetySessionOptions = {}): FileSafetySession {
  const acknowledged = new Map<string, FileRiskAssessment>();
  const logger = createLogger();
  const { context } = options;

  return {
    hasConsent(file: FileLike): boolean {
      const fingerprint = fingerprintFile(file);
      return acknowledged.has(fingerprint);
    },
    recordDecision(file: FileLike, decision: FileSafetyDecision, { risk, meta }: RecordDecisionOptions) {
      const fingerprint = fingerprintFile(file);
      if (decision === 'proceed') {
        acknowledged.set(fingerprint, risk);
      }

      const { matchedExtension, matchedMimeType, reasons } = risk;
      const baseMeta: Record<string, unknown> = {
        context,
        fileName: file.name,
        size: file.size,
        lastModified: file.lastModified,
        decision,
        extension: matchedExtension,
        mimeType: matchedMimeType,
        reasons,
        ...meta,
      };

      if (decision === 'proceed') {
        logger.warn('fileSafety.acceptedRiskyFile', baseMeta);
      } else {
        logger.info('fileSafety.rejectedRiskyFile', baseMeta);
      }
    },
  };
}

export type { FileLike };
