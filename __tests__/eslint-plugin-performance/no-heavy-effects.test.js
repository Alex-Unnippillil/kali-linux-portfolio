const { RuleTester } = require('eslint');
const rule = require('../../eslint-plugin-performance/rules/no-heavy-effects');

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

tester.run('no-heavy-effects', rule, {
  valid: [
    {
      code: "useEffect(() => {\n  log('render');\n});",
    },
    {
      code: "useEffect(() => {\n  for (const item of items) {\n    crunch(item);\n  }\n}, [items]);",
    },
  ],
  invalid: [
    {
      code: "useEffect(() => {\n  for (let i = 0; i < items.length; i += 1) {\n    crunch(items[i]);\n  }\n});",
      errors: [
        {
          messageId: 'heavyEffect',
          suggestions: [
            {
              messageId: 'addDependencies',
              output: "useEffect(() => {\n  for (let i = 0; i < items.length; i += 1) {\n    crunch(items[i]);\n  }\n}, []);",
            },
          ],
        },
      ],
    },
    {
      code: 'useEffect(() => Promise.all(tasks.map(runTask)));',
      errors: [
        {
          messageId: 'heavyEffect',
          suggestions: [
            {
              messageId: 'addDependencies',
              output: 'useEffect(() => Promise.all(tasks.map(runTask)), []);',
            },
          ],
        },
      ],
    },
  ],
});
