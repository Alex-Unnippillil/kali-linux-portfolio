import { useMemo } from 'react';
import rawFixtures from '../../../data/john/lab-fixtures.json';

export interface WordlistFixture {
  id: string;
  name: string;
  description: string;
  source: string;
  sourceUrl: string;
  fixturePath: string;
  entries: string[];
}

export interface CommandScenario {
  id: string;
  label: string;
  description: string;
  format: string;
  wordlistId: string;
  target: string;
  flags: string[];
  notes: string[];
}

export interface ResultCard {
  id: string;
  title: string;
  summary: string;
  relatedCommand: string;
  output: string;
  interpretation: string[];
}

export interface LabFixturesData {
  wordlists: WordlistFixture[];
  commands: CommandScenario[];
  results: ResultCard[];
}

const isString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => isString(item));

const ensureString = (value: unknown, field: string): string => {
  if (!isString(value)) {
    throw new Error(`Invalid ${field}`);
  }
  return value.trim();
};

const ensureStringArray = (value: unknown, field: string): string[] => {
  if (!isStringArray(value)) {
    throw new Error(`Invalid ${field}`);
  }
  return value.map((item) => item.trim());
};

export const parseLabFixtures = (data: unknown): LabFixturesData => {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Fixture payload must be an object');
  }
  const root = data as Record<string, unknown>;

  const wordlistsRaw = root.wordlists;
  if (!Array.isArray(wordlistsRaw)) {
    throw new Error('wordlists must be an array');
  }
  const wordlists = wordlistsRaw.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`wordlists[${index}] must be an object`);
    }
    const obj = item as Record<string, unknown>;
    return {
      id: ensureString(obj.id, `wordlists[${index}].id`),
      name: ensureString(obj.name, `wordlists[${index}].name`),
      description: ensureString(
        obj.description,
        `wordlists[${index}].description`
      ),
      source: ensureString(obj.source, `wordlists[${index}].source`),
      sourceUrl: ensureString(obj.sourceUrl, `wordlists[${index}].sourceUrl`),
      fixturePath: ensureString(
        obj.fixturePath,
        `wordlists[${index}].fixturePath`
      ),
      entries: ensureStringArray(obj.entries, `wordlists[${index}].entries`),
    } satisfies WordlistFixture;
  });

  const commandsRaw = root.commands;
  if (!Array.isArray(commandsRaw)) {
    throw new Error('commands must be an array');
  }
  const commands = commandsRaw.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`commands[${index}] must be an object`);
    }
    const obj = item as Record<string, unknown>;
    return {
      id: ensureString(obj.id, `commands[${index}].id`),
      label: ensureString(obj.label, `commands[${index}].label`),
      description: ensureString(
        obj.description,
        `commands[${index}].description`
      ),
      format: ensureString(obj.format, `commands[${index}].format`),
      wordlistId: ensureString(
        obj.wordlistId,
        `commands[${index}].wordlistId`
      ),
      target: ensureString(obj.target, `commands[${index}].target`),
      flags: ensureStringArray(obj.flags, `commands[${index}].flags`),
      notes: ensureStringArray(obj.notes, `commands[${index}].notes`),
    } satisfies CommandScenario;
  });

  const resultsRaw = root.results;
  if (!Array.isArray(resultsRaw)) {
    throw new Error('results must be an array');
  }
  const results = resultsRaw.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`results[${index}] must be an object`);
    }
    const obj = item as Record<string, unknown>;
    return {
      id: ensureString(obj.id, `results[${index}].id`),
      title: ensureString(obj.title, `results[${index}].title`),
      summary: ensureString(obj.summary, `results[${index}].summary`),
      relatedCommand: ensureString(
        obj.relatedCommand,
        `results[${index}].relatedCommand`
      ),
      output: ensureString(obj.output, `results[${index}].output`),
      interpretation: ensureStringArray(
        obj.interpretation,
        `results[${index}].interpretation`
      ),
    } satisfies ResultCard;
  });

  return { wordlists, commands, results };
};

const parsedFixtures = parseLabFixtures(rawFixtures);

export const buildSafeCommand = (
  scenario: CommandScenario,
  wordlists: WordlistFixture[],
  overrideWordlistId?: string
): string => {
  const desiredId = overrideWordlistId || scenario.wordlistId;
  const wordlist = wordlists.find((w) => w.id === desiredId);
  const finalWordlist = wordlist || wordlists.find((w) => w.id === scenario.wordlistId);
  const parts = ['john'];
  parts.push(...scenario.flags);
  if (finalWordlist) {
    parts.push(`--wordlist=${finalWordlist.fixturePath}`);
  }
  parts.push(scenario.target);
  return parts.join(' ');
};

export const useLabFixtures = (): LabFixturesData => {
  return useMemo(() => parsedFixtures, []);
};

export const labFixtures = parsedFixtures;
