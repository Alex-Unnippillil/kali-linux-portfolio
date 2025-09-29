import { act, fireEvent, render, screen, within } from '@testing-library/react';

import HtmlRewriterApp from '../apps/html-rewriter';

describe('HtmlRewriterApp', () => {
  it('debounces evaluation when inputs change', () => {
    jest.useFakeTimers();
    try {
      render(<HtmlRewriterApp />);

      const htmlInput = screen.getByLabelText('Sample HTML');
      const rewrittenOutput = screen.getByTestId('rewritten-output');

      expect(rewrittenOutput.textContent).toContain('Rewritten Title');

      fireEvent.change(htmlInput, { target: { value: '<p>First</p>' } });

      // Before debounce duration elapses, the rewritten output should remain unchanged.
      expect(rewrittenOutput.textContent).toContain('Rewritten Title');
      act(() => {
        jest.advanceTimersByTime(350);
      });
      expect(rewrittenOutput.textContent).toContain('Rewritten Title');

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(rewrittenOutput.textContent).toContain('<p>First</p>');
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('renders accurate diff rows for replacements', () => {
    jest.useFakeTimers();
    try {
      render(<HtmlRewriterApp />);

      const htmlInput = screen.getByLabelText('Sample HTML');
      const ruleInput = screen.getByLabelText('Rewrite Rules (JSON)');

      fireEvent.change(htmlInput, { target: { value: '<p>Original</p>' } });
      fireEvent.change(
        ruleInput,
        {
          target: {
            value: JSON.stringify(
              [
                {
                  selector: 'p',
                  action: 'replace',
                  value: 'Updated',
                },
              ],
              null,
              2,
            ),
          },
        },
      );

      act(() => {
        jest.advanceTimersByTime(400);
      });

      const rows = screen.getAllByTestId('diff-row');
      const removedRow = rows.find((row) => row.getAttribute('data-change-type') === 'removed');
      const addedRow = rows.find((row) => row.getAttribute('data-change-type') === 'added');

      expect(removedRow).toBeTruthy();
      expect(addedRow).toBeTruthy();

      if (!removedRow || !addedRow) {
        throw new Error('Expected diff rows were not found');
      }

      expect(within(removedRow).getByTestId('diff-before-cell').textContent).toBe('<p>Original</p>');
      expect(within(addedRow).getByTestId('diff-after-cell').textContent).toBe('<p>Updated</p>');
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });
});
