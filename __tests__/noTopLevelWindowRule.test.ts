import { RuleTester } from 'eslint';

import plugin from '../eslint-plugin-no-top-level-window';
import rule from '../eslint-plugin-no-top-level-window/no-top-level-window-or-document';

describe('no-top-level-window-or-document rule', () => {
  const ruleTester = new RuleTester({
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
      },
    },
  });

  ruleTester.run('no-top-level-window-or-document', rule, {
    valid: [
      "function demo(window) { return window.location; }",
      "const handler = () => { const document = { readyState: 'complete' }; return document.readyState; };",
      "const localOnly = () => { const window = { location: 'demo' }; return window.location; };",
    ],
    invalid: [
      {
        code: "window.location.href = 'https://example.com';",
        errors: [{ message: "Unexpected global 'window'." }],
      },
      {
        code: "document.title = 'Test';",
        errors: [{ message: "Unexpected global 'document'." }],
      },
      {
        code: 'const alias = window;',
        errors: [{ message: "Unexpected global 'window'." }],
      },
    ],
  });

  it('exposes the rule through the plugin entry point', () => {
    expect(plugin.rules['no-top-level-window-or-document']).toBe(rule);
  });
});
