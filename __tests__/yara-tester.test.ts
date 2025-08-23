import yaraFactory from 'libyara-wasm';

test('yara matches simple string', async () => {
  const yara = await (yaraFactory.default ? yaraFactory.default() : yaraFactory());
  const rule = "rule T { strings: $a = \"abc\" condition: $a }";
  const res = yara.run('xxabcxx', rule);
  const matches = res.matchedRules;
  expect(matches.size()).toBe(1);
  expect(matches.get(0).ruleName).toBe('T');
});
