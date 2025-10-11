export interface NiktoCommandOptions {
  host?: string;
  port?: string;
  useSsl?: boolean;
  tuning?: string;
  plugins?: string[];
  randomizeUserAgent?: boolean;
  userAgent?: string;
  outputFormat?: string;
  outputFile?: string;
  useInputFile?: boolean;
  inputFile?: string;
  labSimulation?: boolean;
}

const quote = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '""';
  return trimmed.includes(' ') || trimmed.includes('"')
    ? `"${trimmed.replace(/"/g, '\\"')}"`
    : trimmed;
};

export const buildNiktoCommand = ({
  host,
  port,
  useSsl,
  tuning,
  plugins,
  randomizeUserAgent,
  userAgent,
  outputFormat,
  outputFile,
  useInputFile,
  inputFile,
  labSimulation = true,
}: NiktoCommandOptions): string => {
  const parts: string[] = ['nikto'];

  if (useInputFile) {
    const file = inputFile?.trim() || 'targets.txt';
    parts.push('-i', quote(file));
  } else {
    const targetHost = host?.trim() || 'TARGET';
    parts.push('-h', quote(targetHost));
  }

  if (port?.trim()) {
    parts.push('-p', port.trim());
  }

  if (useSsl) {
    parts.push('-ssl');
  }

  if (tuning?.trim()) {
    parts.push('-Tuning', tuning.trim());
  }

  if (plugins && plugins.length > 0) {
    parts.push('-Plugins', plugins.join(','));
  }

  const normalizedAgent = userAgent?.trim();
  if (randomizeUserAgent) {
    const agent = normalizedAgent || 'Mozilla/5.0 (Lab Simulation)';
    parts.push('-useragent', quote(`${agent} [randomized]`));
  } else if (normalizedAgent) {
    parts.push('-useragent', quote(normalizedAgent));
  }

  if (outputFile?.trim()) {
    parts.push('-output', quote(outputFile.trim()));
    if (outputFormat?.trim()) {
      parts.push('-Format', outputFormat.trim());
    }
  } else if (outputFormat?.trim()) {
    parts.push('-Format', outputFormat.trim());
  }

  const command = parts.join(' ');
  return labSimulation ? `${command}  # simulation only` : command;
};

export default buildNiktoCommand;
