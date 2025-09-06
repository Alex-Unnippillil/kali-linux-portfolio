const { RuleTester } = require('eslint');
const rule = require('../eslint-plugin-no-top-level-window/no-top-level-window-or-document');

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-top-level-window-or-document', rule, {
  valid: [
    "function ok() { window.alert('hi'); }",
    "const fn = () => { document.title; };",
  ],
  invalid: [
    {
      code: "window.alert('hi');",
      errors: [{ message: "Unexpected global 'window'." }],
    },
    {
      code: 'document.title;',
      errors: [{ message: "Unexpected global 'document'." }],
    },
  ],
});
