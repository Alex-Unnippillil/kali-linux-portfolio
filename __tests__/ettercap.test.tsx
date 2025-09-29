import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterEditor from '../apps/ettercap/components/FilterEditor';
import FilterPreview from '../apps/ettercap/components/FilterPreview';
import { EttercapFilterProvider } from '../apps/ettercap/components/FilterStateProvider';

const lintFilter = (code: string) => {
  const messages: { line: number; message: string }[] = [];
  const lines = code.split(/\n/);

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [command, ...rest] = trimmed.split(/\s+/);
    const lineNumber = idx + 1;

    if (command !== 'drop' && command !== 'replace') {
      messages.push({ line: lineNumber, message: `Unknown command "${command}"` });
      return;
    }

    if (command === 'drop') {
      if (rest.length === 0) {
        messages.push({ line: lineNumber, message: 'drop requires a pattern to remove' });
      }
      return;
    }

    if (rest.length < 2) {
      messages.push({
        line: lineNumber,
        message: 'replace requires a pattern and a replacement',
      });
    } else if (rest.length > 2) {
      messages.push({ line: lineNumber, message: 'replace only accepts two parameters' });
    }
  });

  return messages;
};

class MockWorker {
  private listeners = new Set<(event: MessageEvent<{ type: string; messages: ReturnType<typeof lintFilter> }>) => void>();

  postMessage(data: { type: string; code: string }) {
    if (data.type !== 'lint') return;
    const messages = lintFilter(data.code ?? '');
    const event = { data: { type: 'lint', messages } } as MessageEvent<{
      type: string;
      messages: ReturnType<typeof lintFilter>;
    }>;
    this.listeners.forEach((listener) => listener(event));
  }

  addEventListener(type: string, listener: (event: MessageEvent<any>) => void) {
    if (type !== 'message') return;
    this.listeners.add(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent<any>) => void) {
    if (type !== 'message') return;
    this.listeners.delete(listener);
  }

  terminate() {
    this.listeners.clear();
  }
}

describe('Ettercap filter editor', () => {
  beforeEach(() => {
    (global as any).Worker = MockWorker;
    window.localStorage?.clear?.();
  });

  afterEach(() => {
    delete (global as any).Worker;
  });

  it('updates lint warnings when the script changes', async () => {
    const user = userEvent.setup();
    render(
      <EttercapFilterProvider>
        <FilterEditor />
      </EttercapFilterProvider>,
    );

    await screen.findByText(/No lint warnings detected/i);

    const textarea = screen.getByLabelText(/filter script/i);
    await user.clear(textarea);
    await user.type(textarea, 'foo');

    await waitFor(() =>
      expect(screen.getByText(/Unknown command "foo"/i)).toBeInTheDocument(),
    );

    await user.clear(textarea);
    await user.type(textarea, 'drop foo');

    await waitFor(() =>
      expect(screen.getByText(/No lint warnings detected/i)).toBeInTheDocument(),
    );
  });

  it('keeps preview and lint state in sync with edits', async () => {
    const user = userEvent.setup();
    render(
      <EttercapFilterProvider>
        <FilterEditor />
        <FilterPreview />
      </EttercapFilterProvider>,
    );

    await waitFor(() =>
      expect(
        within(screen.getByTestId('ettercap-after-list')).queryByText('DNS query example.com'),
      ).not.toBeInTheDocument(),
    );

    const textarea = screen.getByLabelText(/filter script/i);
    await user.clear(textarea);
    await user.type(textarea, 'replace example.com test.org');

    await waitFor(() =>
      expect(
        within(screen.getByTestId('ettercap-after-list')).getByText('DNS query test.org'),
      ).toBeInTheDocument(),
    );

    expect(
      within(screen.getByTestId('ettercap-before-list')).getByText('DNS query example.com'),
    ).toBeInTheDocument();
    expect(screen.getByText(/No lint warnings detected/i)).toBeInTheDocument();
  });
});
