import { DiskNode, DiskEntryKind, pathToId } from '@/types/disk';

interface RawNode {
  name: string;
  type: DiskEntryKind;
  size?: number;
  modified?: number;
  children?: RawNode[];
}

const now = Date.now();

const rawSample: RawNode = {
  name: 'Sample Disk',
  type: 'directory',
  children: [
    {
      name: 'Home',
      type: 'directory',
      children: [
        {
          name: 'Pictures',
          type: 'directory',
          children: [
            { name: 'vacation.jpg', type: 'file', size: 18_728_448, modified: now - 1000 * 60 * 60 * 24 * 8 },
            { name: 'wallpaper.png', type: 'file', size: 6_553_600, modified: now - 1000 * 60 * 60 * 24 * 30 },
            { name: 'family.png', type: 'file', size: 12_582_912, modified: now - 1000 * 60 * 60 * 24 * 12 },
          ],
        },
        {
          name: 'Documents',
          type: 'directory',
          children: [
            { name: 'resume.pdf', type: 'file', size: 327_680, modified: now - 1000 * 60 * 60 * 24 * 2 },
            { name: 'project-proposal.docx', type: 'file', size: 1_572_864, modified: now - 1000 * 60 * 60 * 24 * 20 },
            { name: 'budget.xlsx', type: 'file', size: 2_416_640, modified: now - 1000 * 60 * 60 * 24 * 40 },
          ],
        },
        {
          name: 'Archive',
          type: 'directory',
          children: [
            { name: 'logs-2022.zip', type: 'file', size: 54_231_808, modified: now - 1000 * 60 * 60 * 24 * 200 },
            { name: 'training.tar', type: 'file', size: 102_760_448, modified: now - 1000 * 60 * 60 * 24 * 160 },
          ],
        },
      ],
    },
    {
      name: 'Projects',
      type: 'directory',
      children: [
        {
          name: 'kali-portfolio',
          type: 'directory',
          children: [
            { name: 'node_modules', type: 'directory', children: [] },
            { name: 'dist', type: 'directory', children: [] },
            { name: 'README.md', type: 'file', size: 15_360, modified: now - 1000 * 60 * 60 * 6 },
            { name: 'package.json', type: 'file', size: 4_096, modified: now - 1000 * 60 * 60 * 6 },
            { name: 'yarn.lock', type: 'file', size: 1_572_864, modified: now - 1000 * 60 * 60 * 6 },
          ],
        },
        {
          name: 'threat-model',
          type: 'directory',
          children: [
            { name: 'diagram.drawio', type: 'file', size: 4_743_168, modified: now - 1000 * 60 * 60 * 24 * 15 },
            { name: 'notes.md', type: 'file', size: 86_016, modified: now - 1000 * 60 * 60 * 24 * 11 },
          ],
        },
      ],
    },
    {
      name: 'Media',
      type: 'directory',
      children: [
        { name: 'podcast.mp3', type: 'file', size: 87_312_384, modified: now - 1000 * 60 * 60 * 24 * 5 },
        { name: 'conference.mp4', type: 'file', size: 452_984_832, modified: now - 1000 * 60 * 60 * 24 * 45 },
        { name: 'camera-roll.mov', type: 'file', size: 1_024_000_000, modified: now - 1000 * 60 * 60 * 24 * 90 },
      ],
    },
    {
      name: 'Backups',
      type: 'directory',
      children: [
        { name: 'full-backup-2023.img', type: 'file', size: 1_500_000_000, modified: now - 1000 * 60 * 60 * 24 * 180 },
        { name: 'incremental-2024-01.img', type: 'file', size: 740_000_000, modified: now - 1000 * 60 * 60 * 24 * 120 },
      ],
    },
    { name: 'system.log', type: 'file', size: 42_000_000, modified: now - 1000 * 60 * 60 * 24 },
    { name: 'package-cache.tar', type: 'file', size: 280_000_000, modified: now - 1000 * 60 * 60 * 24 * 32 },
  ],
};

const buildNode = (raw: RawNode, path: string[]): DiskNode => {
  const parentId = path.length ? pathToId(path.slice(0, -1)) : null;
  if (raw.type === 'file') {
    return {
      id: pathToId(path),
      name: raw.name,
      path,
      parentId,
      type: 'file',
      size: raw.size ?? 0,
      fileCount: 1,
      dirCount: 0,
      modified: raw.modified,
    };
  }

  const children = (raw.children ?? []).map((child) => buildNode(child, [...path, child.name]));
  const size = children.reduce((sum, child) => sum + child.size, 0);
  const fileCount = children.reduce((sum, child) => sum + child.fileCount, 0);
  const dirCount = children.reduce(
    (sum, child) => sum + (child.type === 'directory' ? 1 + child.dirCount : child.dirCount),
    0,
  );
  const latestChild = Math.max(0, ...children.map((child) => child.modified ?? 0));
  const modified = raw.modified ?? (latestChild > 0 ? latestChild : undefined);

  return {
    id: pathToId(path),
    name: raw.name,
    path,
    parentId,
    type: 'directory',
    size,
    fileCount,
    dirCount,
    children,
    modified,
  };
};

export const sampleDiskData: DiskNode = buildNode(rawSample, []);
