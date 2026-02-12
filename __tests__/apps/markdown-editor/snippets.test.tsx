import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import Snippets from '../../../apps/markdown-editor/components/Snippets';
import {
  MarkdownEditorProvider,
  useMarkdownEditor,
} from '../../../apps/markdown-editor/state/MarkdownEditorContext';

describe('Markdown editor snippets', () => {
  const TestEditor: React.FC = () => {
    const { value, setValue, textareaRef } = useMarkdownEditor();
    return (
      <>
        <textarea
          aria-label="Markdown editor"
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <Snippets />
      </>
    );
  };

  const setup = (initialValue = '') => {
    const utils = render(
      <MarkdownEditorProvider initialValue={initialValue}>
        <TestEditor />
      </MarkdownEditorProvider>,
    );
    const textarea = utils.getByLabelText('Markdown editor') as HTMLTextAreaElement;
    textarea.focus();
    return { ...utils, textarea };
  };

  it('wraps selection as heading via keyboard shortcut', () => {
    const { textarea } = setup('hello world');
    textarea.setSelectionRange(0, textarea.value.length);
    fireEvent.keyDown(window, { key: '1', ctrlKey: true, shiftKey: true });

    expect(textarea.value).toBe('## hello world\n');
  });

  it('creates a markdown table from CSV selection', () => {
    const csv = 'Feature,Priority\nSnippets,High\nTables,Medium';
    const { textarea } = setup(csv);
    textarea.setSelectionRange(0, textarea.value.length);

    fireEvent.keyDown(window, { key: '2', ctrlKey: true, shiftKey: true });

    expect(textarea.value).toBe(
      ['| Feature | Priority |', '| --- | --- |', '| Snippets | High |', '| Tables | Medium |', ''].join('\n'),
    );
  });

  it('turns selected lines into a task list', () => {
    const { textarea } = setup('Write docs\nShip feature');
    textarea.setSelectionRange(0, textarea.value.length);

    fireEvent.keyDown(window, { key: '3', ctrlKey: true, shiftKey: true });

    expect(textarea.value).toBe(
      ['- [ ] Write docs', '- [ ] Ship feature', ''].join('\n'),
    );
  });

  it('builds a callout from selection', () => {
    const { textarea } = setup('Remember to test');
    textarea.setSelectionRange(0, textarea.value.length);

    fireEvent.keyDown(window, { key: '4', ctrlKey: true, shiftKey: true });

    expect(textarea.value).toBe(['> [!NOTE]', '> Remember to test', ''].join('\n'));
  });

  it('inserts placeholder heading when clicking palette button', () => {
    const { textarea, getByText } = setup('');

    fireEvent.click(getByText('Heading'));

    expect(textarea.value).toBe('## Section title\n\n');
    const placeholderStart = textarea.value.indexOf('Section title');
    expect(placeholderStart).toBeGreaterThan(-1);
    expect(textarea.selectionStart).toBe(placeholderStart);
    expect(textarea.selectionEnd).toBe(placeholderStart + 'Section title'.length);
  });
});
