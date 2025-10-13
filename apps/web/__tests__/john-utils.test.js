import { parseRules, distributeTasks } from '../components/apps/john/utils';

describe('john utilities', () => {
  test('parseRules filters comments and empty lines', () => {
    const text = '# comment\nrule1\n\nrule2\n# another';
    expect(parseRules(text)).toEqual(['rule1', 'rule2']);
  });

  test('distributeTasks assigns hashes round-robin', () => {
    const hashes = ['h1', 'h2', 'h3', 'h4'];
    const endpoints = ['e1', 'e2'];
    expect(distributeTasks(hashes, endpoints)).toEqual({
      e1: ['h1', 'h3'],
      e2: ['h2', 'h4'],
    });
  });
});
