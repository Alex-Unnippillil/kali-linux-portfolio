import rawFixtures from '../data/john/lab-fixtures.json';
import {
  buildSafeCommand,
  parseLabFixtures,
  labFixtures,
} from '../apps/john/lib/fixtures';

describe('john lab fixtures', () => {
  it('parses the fixture payload', () => {
    const parsed = parseLabFixtures(rawFixtures);
    expect(parsed.wordlists).toHaveLength(3);
    expect(parsed.commands).toHaveLength(3);
    expect(parsed.results).toHaveLength(2);
    const firstWordlist = parsed.wordlists[0];
    expect(firstWordlist.fixturePath).toMatch(/seclists-top-20/);
  });

  it('builds a safe command using defaults', () => {
    const scenario = labFixtures.commands.find(
      (item) => item.id === 'raw-md5-single'
    );
    expect(scenario).toBeDefined();
    const command = buildSafeCommand(
      scenario!,
      labFixtures.wordlists
    );
    expect(command).toContain('--format=raw-md5');
    expect(command).toContain('/fixtures/john/seclists-top-20.txt');
  });

  it('builds a safe command with an override wordlist', () => {
    const scenario = labFixtures.commands.find(
      (item) => item.id === 'raw-md5-single'
    );
    const override = labFixtures.wordlists.find(
      (item) => item.id === 'ncsc-top-10'
    );
    expect(scenario).toBeDefined();
    expect(override).toBeDefined();
    const command = buildSafeCommand(
      scenario!,
      labFixtures.wordlists,
      override!.id
    );
    expect(command).toContain(override!.fixturePath);
  });

  it('throws when payload is not an object', () => {
    expect(() => parseLabFixtures(null as unknown)).toThrow(
      'Fixture payload must be an object'
    );
  });

  it('throws when a wordlist is missing fields', () => {
    const invalid = {
      wordlists: [{ id: 'missing-fields' }],
      commands: [],
      results: [],
    } as unknown;
    expect(() => parseLabFixtures(invalid)).toThrow(/wordlists\[0\]\.name/);
  });
});
