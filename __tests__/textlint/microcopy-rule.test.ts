import { TextlintKernel } from '@textlint/kernel';
import markdownPlugin from '@textlint/textlint-plugin-markdown';

const rule = require('../../plugins/textlint/rules/microcopy-banned-phrases');

const kernel = new TextlintKernel();

const lint = async (text: string) => {
  const result = await kernel.lintText(text, {
    ext: '.md',
    filePath: 'microcopy.md',
    plugins: [
      {
        pluginId: 'markdown',
        plugin: markdownPlugin,
      },
    ],
    rules: [
      {
        ruleId: 'microcopy-banned-phrases',
        rule,
        options: { phrases: rule.DEFAULT_PHRASES },
      },
    ],
  });

  return result.messages;
};

describe('microcopy-banned-phrases rule', () => {
  it('flags banned phrases from the default list', async () => {
    const messages = await lint('Click here to open the report.');
    expect(messages).toHaveLength(1);
    expect(messages[0].message).toContain('click here');
  });

  it('allows copy that follows the guidelines', async () => {
    const messages = await lint('Open the report to review findings.');
    expect(messages).toHaveLength(0);
  });

  it('identifies multiple violations in the same sentence', async () => {
    const messages = await lint('Simply click here to finish.');
    expect(messages).toHaveLength(2);
    expect(messages[0].message).toMatch(/simply/i);
    expect(messages[1].message).toMatch(/click here/i);
  });
});
