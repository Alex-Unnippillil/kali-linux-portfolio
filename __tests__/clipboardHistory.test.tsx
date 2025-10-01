import React from 'react';
import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import ClipboardHistory from '../components/common/ClipboardHistory';

describe('ClipboardHistory', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.body.innerHTML = '';
  });

  const dispatchPaste = (text: string) => {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: {
        getData: (type: string) => (type === 'text/plain' ? text : ''),
      },
    });
    act(() => {
      window.dispatchEvent(event);
    });
  };

  it('records entries, enforces limits, and clears sensitive content', async () => {
    render(
      <div>
        <input data-testid="target" />
        <ClipboardHistory />
      </div>,
    );

    const privacyToggle = await screen.findByRole('button', { name: /reveal entries/i });

    dispatchPaste('public note');

    await waitFor(() => {
      expect(screen.getByText(/Hidden content/)).toBeInTheDocument();
    });

    fireEvent.click(privacyToggle);

    await waitFor(() => {
      expect(screen.getByText('public note')).toBeInTheDocument();
    });

    dispatchPaste('password=12345');

    await waitFor(() => {
      const entry = screen.getByText('password=12345').closest('li');
      expect(entry).not.toBeNull();
      expect(within(entry as HTMLElement).getByText('Sensitive')).toBeInTheDocument();
    });

    const clearButton = screen.getByRole('button', { name: /Clear sensitive entries/i });
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.queryByText('password=12345')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(clearButton).toBeDisabled();
    });

    for (let index = 0; index < 22; index += 1) {
      dispatchPaste(`entry-${index}`);
    }

    await waitFor(() => {
      const entryItems = screen.getAllByLabelText(/Clipboard entry from/);
      expect(entryItems).toHaveLength(20);
    });
  });

  it('toggles privacy mode to reveal or hide clipboard content', async () => {
    render(<ClipboardHistory />);

    dispatchPaste('top secret');

    await waitFor(() => {
      expect(screen.getByText(/Hidden content/)).toBeInTheDocument();
    });

    const toggle = screen.getByRole('button', { name: /Reveal entries/i });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByText('top secret')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Hide entries/i }));

    await waitFor(() => {
      expect(screen.getByText(/Hidden content/)).toBeInTheDocument();
    });
  });

  it('pastes sanitized variations into the focused input', async () => {
    render(
      <div>
        <textarea data-testid="sink" />
        <ClipboardHistory />
      </div>,
    );

    const toggle = await screen.findByRole('button', { name: /reveal entries/i });

    dispatchPaste('line\r\n<script>alert(1)</script>');
    dispatchPaste('{"greeting":"hello","nested":{"value":1}}');

    fireEvent.click(toggle);

    const sink = screen.getByTestId('sink') as HTMLTextAreaElement;

    const entries = screen.getAllByLabelText(/Clipboard entry from/);
    const jsonEntry = entries[0];
    const plainEntry = entries[1];

    // Plain text
    sink.focus();
    sink.setSelectionRange(0, 0);
    fireEvent.click(within(plainEntry).getByRole('button', { name: /Paste as plain text/i }));
    expect(sink.value).toBe('line\n<script>alert(1)</script>');

    // Escaped HTML
    sink.value = '';
    sink.focus();
    sink.setSelectionRange(0, 0);
    fireEvent.click(within(plainEntry).getByRole('button', { name: /Paste escaped/i }));
    expect(sink.value).toBe('line\n&lt;script&gt;alert(1)&lt;/script&gt;');

    // JSON formatting
    sink.value = '';
    sink.focus();
    sink.setSelectionRange(0, 0);
    fireEvent.click(within(jsonEntry).getByRole('button', { name: /Paste JSON/i }));
    expect(sink.value).toBe(`{
  "greeting": "hello",
  "nested": {
    "value": 1
  }
}`);
  });
});
