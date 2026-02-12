import fs from 'fs';
import path from 'path';
import {
  FileNodeInput,
  MetadataIndex,
  SensitivityTag,
  buildMetadata,
} from '../modules/filesystem/metadata';
import {
  DlpMoveResult,
  dlpAwareMove,
  DlpPromptContext,
} from '../components/apps/files/Actions';
import {
  clearAllDecisions,
  listStoredDecisions,
} from '../utils/settings/dlp';

const TAG_FILE = '.tags.json';

const readDirectoryTags = (dirPath: string): SensitivityTag[] | undefined => {
  const tagFile = path.join(dirPath, TAG_FILE);
  if (!fs.existsSync(tagFile)) return undefined;
  try {
    const raw = fs.readFileSync(tagFile, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SensitivityTag[]) : undefined;
  } catch {
    return undefined;
  }
};

const loadDirectory = (dirPath: string, name: string): FileNodeInput => {
  const tags = readDirectoryTags(dirPath);
  const entries = fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.name !== TAG_FILE)
    .sort((a, b) => a.name.localeCompare(b.name));

  const children: FileNodeInput[] = entries.map((entry) => {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return loadDirectory(entryPath, entry.name);
    }
    return {
      name: entry.name,
      type: 'file',
    };
  });

  return {
    name,
    type: 'directory',
    tags,
    children,
  };
};

const loadFixture = (rootDir: string): { tree: FileNodeInput; index: MetadataIndex } => {
  const rootTags = readDirectoryTags(rootDir);
  const entries = fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.name !== TAG_FILE)
    .sort((a, b) => a.name.localeCompare(b.name));

  const children = entries.map((entry) => {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      return loadDirectory(entryPath, entry.name);
    }
    return {
      name: entry.name,
      type: 'file',
    } as FileNodeInput;
  });

  const tree: FileNodeInput = {
    name: '/',
    type: 'directory',
    tags: rootTags,
    children,
  };

  return buildMetadata(tree);
};

describe('filesystem metadata sensitivity propagation', () => {
  const fixtureRoot = path.join(__dirname, 'fixtures', 'dlp', 'policy');

  beforeEach(() => {
    clearAllDecisions();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('propagates sensitivity tags to descendant files', () => {
    const { index } = loadFixture(fixtureRoot);
    const confidential = index.get('/confidential/projects/plan.txt');
    const restricted = index.get('/restricted/audit.log');
    const publicDir = index.get('/public');

    expect(confidential).toBeDefined();
    expect(confidential?.effectiveTags).toContain('confidential');
    expect(confidential?.inheritedTags).toContain('confidential');

    expect(restricted).toBeDefined();
    expect(restricted?.effectiveTags).toContain('restricted');

    expect(publicDir?.effectiveTags).toContain('public');
  });

  it('prompts and records alternate action when moving sensitive data to public location', async () => {
    const { index } = loadFixture(fixtureRoot);
    const prompt = jest.fn(async (context: DlpPromptContext) => {
      expect(context.downgradedTags).toContain('confidential');
      expect(context.recommendedAction).toBe('copy');
      expect(context.offlineMode).toBe(true);
      expect(context.demoMode).toBe(true);
      return { action: 'copy', remember: true };
    });

    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

    try {
      const firstResult: DlpMoveResult = await dlpAwareMove({
        sources: ['/confidential/projects/plan.txt'],
        destination: '/public',
        metadata: index,
        prompt,
        offlineMode: true,
        demoMode: true,
      });

      expect(prompt).toHaveBeenCalledTimes(1);
      expect(firstResult.promptShown).toBe(true);
      expect(firstResult.action).toBe('copy');
      expect(firstResult.storedDecision).toBe('copy');
      expect(firstResult.usedStoredDecision).toBe(false);
      expect(listStoredDecisions()).toHaveLength(1);

      const loggedEntry = infoSpy.mock.calls.find((call) => call[0] === '[dlp]');
      expect(loggedEntry?.[1]).toMatchObject({
        action: 'copy',
        offlineMode: true,
        demoMode: true,
      });

      const secondPrompt = jest.fn();
      const secondResult = await dlpAwareMove({
        sources: ['/confidential/projects/plan.txt'],
        destination: '/public',
        metadata: index,
        prompt: secondPrompt,
      });

      expect(secondPrompt).not.toHaveBeenCalled();
      expect(secondResult.usedStoredDecision).toBe(true);
      expect(secondResult.action).toBe('copy');
    } finally {
      infoSpy.mockRestore();
    }
  });
});
