import { promises as fs } from 'fs';
import path from 'path';

const REPO_URL = 'https://github.com/Alex-Unnippillil/kali-linux-portfolio';
const CHANGELOG_URL = `${REPO_URL}/blob/main/CHANGELOG.md`;
const CHANGELOG_PATH = path.join(process.cwd(), 'CHANGELOG.md');
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'release-notes.json');

const headingSlug = (version, date) => {
  const heading = `[${version}]${date ? ` - ${date}` : ''}`;
  return heading
    .toLowerCase()
    .replace(/[\[\]]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
};

const createEntryUrl = (version, date) => `${CHANGELOG_URL}#${headingSlug(version, date)}`;

const ensureSection = (entry, title = 'Changes') => {
  if (!entry.currentSection) {
    entry.currentSection = { title, items: [], description: '' };
    entry.sections.push(entry.currentSection);
  }
  return entry.currentSection;
};

const pushEntry = (entries, entryState) => {
  if (!entryState.currentEntry) return;

  const sections = entryState.sections
    .map((section) => {
      const items = section.items
        .map((item) => item.trim())
        .filter(Boolean);
      const description = section.description?.trim?.();
      const result = {
        title: section.title,
        ...(items.length > 0 ? { items } : {}),
        ...(description ? { description } : {}),
      };
      return result;
    })
    .filter((section) => (section.items && section.items.length > 0) || section.description);

  const entry = {
    version: entryState.currentEntry.version,
    ...(entryState.currentEntry.date ? { date: entryState.currentEntry.date } : {}),
    url: createEntryUrl(entryState.currentEntry.version, entryState.currentEntry.date),
    sections,
  };
  entries.push(entry);
  entryState.currentEntry = null;
  entryState.sections = [];
  entryState.currentSection = null;
  entryState.currentItemIndex = -1;
};

const parseChangelog = (raw) => {
  const lines = raw.split(/\r?\n/);
  const entries = [];
  const state = {
    currentEntry: null,
    sections: [],
    currentSection: null,
    currentItemIndex: -1,
  };

  for (const originalLine of lines) {
    const line = originalLine.replace(/\r$/, '');
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      state.currentItemIndex = -1;
      continue;
    }

    if (/^\[[^\]]+\]:/.test(trimmed)) {
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      continue;
    }

    const entryMatch = trimmed.match(/^## \[(.+?)\](?: - ([^\]]+))?/);
    if (entryMatch) {
      pushEntry(entries, state);
      const version = entryMatch[1].trim();
      const date = entryMatch[2]?.trim() ?? null;
      if (version.toLowerCase() === 'unreleased') {
        state.currentEntry = null;
        state.sections = [];
        state.currentSection = null;
        state.currentItemIndex = -1;
        continue;
      }
      state.currentEntry = { version, date };
      state.sections = [];
      state.currentSection = null;
      state.currentItemIndex = -1;
      continue;
    }

    if (!state.currentEntry) {
      continue;
    }

    const sectionMatch = trimmed.match(/^### (.+)$/);
    if (sectionMatch) {
      state.currentSection = {
        title: sectionMatch[1].trim(),
        items: [],
        description: '',
      };
      state.sections.push(state.currentSection);
      state.currentItemIndex = -1;
      continue;
    }

    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (bulletMatch) {
      const section = ensureSection(state, state.currentSection?.title ?? 'Changes');
      const text = bulletMatch[1].trim();
      section.items.push(text);
      state.currentItemIndex = section.items.length - 1;
      continue;
    }

    const continuationMatch = line.match(/^\s{2,}(.*)$/);
    if (continuationMatch && state.currentSection && state.currentItemIndex >= 0) {
      const addition = continuationMatch[1].trim();
      if (addition) {
        state.currentSection.items[state.currentItemIndex] += ` ${addition}`;
      }
      continue;
    }

    const section = ensureSection(state, state.currentSection?.title ?? 'Changes');
    section.description = section.description
      ? `${section.description} ${trimmed}`
      : trimmed;
    state.currentItemIndex = -1;
  }

  pushEntry(entries, state);
  return entries;
};

const run = async () => {
  let changelog;
  try {
    changelog = await fs.readFile(CHANGELOG_PATH, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read CHANGELOG.md: ${error instanceof Error ? error.message : String(error)}`);
  }

  const entries = parseChangelog(changelog);

  if (!entries.length) {
    throw new Error('No release entries found in CHANGELOG.md');
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: {
      changelog: CHANGELOG_URL,
    },
    latest: entries[0],
    entries,
  };

  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(
    `[release-notes] Generated ${path.relative(process.cwd(), OUTPUT_PATH)} with ${entries.length} release${
      entries.length === 1 ? '' : 's'
    }.`,
  );
};

run().catch((error) => {
  console.error('[release-notes] Generation failed:', error);
  process.exitCode = 1;
});
