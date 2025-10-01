import { spawnSync } from 'child_process';
import path from 'path';

const execGit = (args) => {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    return '';
  }
  return result.stdout.trim();
};

const resolveBaseRevision = () => {
  const candidates = [
    ['merge-base', '--fork-point', 'origin/main', 'HEAD'],
    ['merge-base', 'origin/main', 'HEAD'],
    ['merge-base', '--fork-point', 'origin/master', 'HEAD'],
    ['merge-base', 'origin/master', 'HEAD'],
    ['rev-parse', 'HEAD^'],
  ];

  for (const candidate of candidates) {
    const result = execGit(candidate);
    if (result) {
      return result.split('\n')[0];
    }
  }

  return '';
};

export const collectChangedFiles = ({
  extensions,
  stagedOnly = false,
  since,
  includeUntracked = true,
  normalize = false,
} = {}) => {
  const files = new Set();

  if (stagedOnly) {
    const diffStaged = execGit(['diff', '--cached', '--name-only', '--diff-filter=ACMRTUXB']);
    diffStaged
      .split('\n')
      .filter(Boolean)
      .forEach((file) => files.add(file));
  } else {
    const base = since || resolveBaseRevision();
    if (base) {
      const diffBase = execGit(['diff', '--name-only', '--diff-filter=ACMRTUXB', `${base}...HEAD`]);
      diffBase
        .split('\n')
        .filter(Boolean)
        .forEach((file) => files.add(file));
    }

    const diffHead = execGit(['diff', '--name-only', '--diff-filter=ACMRTUXB', 'HEAD']);
    diffHead
      .split('\n')
      .filter(Boolean)
      .forEach((file) => files.add(file));

    if (includeUntracked) {
      const untracked = execGit(['ls-files', '--others', '--exclude-standard']);
      untracked
        .split('\n')
        .filter(Boolean)
        .forEach((file) => files.add(file));
    }
  }

  const filtered = Array.from(files).filter((file) => {
    if (file.split(path.sep).includes('node_modules')) {
      return false;
    }

    if (!extensions || extensions.size === 0) {
      return true;
    }

    const ext = path.extname(file);
    return extensions.has(ext);
  });

  if (!normalize) {
    return filtered;
  }

  return filtered.map((file) => file.split(path.sep).join('/'));
};

