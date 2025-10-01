const { RuleTester } = require('eslint');
const rule = require('../../eslint-plugin-performance/rules/no-unnecessary-renders');

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

tester.run('no-unnecessary-renders', rule, {
  valid: [
    {
      code: 'const value = useMemo(() => compute(input), [input]);',
    },
    {
      code: 'const handler = React.useCallback(() => dispatch(action), [dispatch, action]);',
    },
  ],
  invalid: [
    {
      code: 'const value = useMemo(() => compute(input));',
      errors: [
        {
          messageId: 'provideDependencies',
          suggestions: [
            {
              messageId: 'addEmptyDependencyArray',
              output: 'const value = useMemo(() => compute(input), []);',
            },
          ],
        },
      ],
    },
    {
      code: 'const handler = React.useCallback(() => dispatch(action));',
      errors: [
        {
          messageId: 'provideDependencies',
          suggestions: [
            {
              messageId: 'addEmptyDependencyArray',
              output: 'const handler = React.useCallback(() => dispatch(action), []);',
            },
          ],
        },
      ],
    },
    {
      code: 'const memoized = useMemo(() => build(), dependencies);',
      errors: [{ messageId: 'provideDependencies' }],
    },
  ],
});
