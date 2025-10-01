import 'fake-indexeddb/auto';

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import QuickNotes from '../components/common/QuickNotes';
import {
  clearQuickNotes,
  getNoteForRoute,
  searchQuickNotes,
} from '../utils/quickNotesStore';

jest.mock('marked', () => ({ marked: { parse: (text: string) => text } }));

const routerMock = {
  asPath: '/',
  isReady: true,
  push: jest.fn(async (url: string) => {
    routerMock.asPath = typeof url === 'string' ? url : '/';
    return true;
  }),
  events: {
    on: jest.fn(),
    off: jest.fn(),
  },
};

jest.mock('next/router', () => ({
  useRouter: () => routerMock,
}));

const setCurrentUrl = (url: string) => {
  routerMock.asPath = url;
};

const navigate = async (url: string) => {
  routerMock.asPath = url;
  await Promise.resolve();
};

describe('QuickNotes', () => {
  beforeEach(async () => {
    setCurrentUrl('/');
    window.localStorage.clear();
    await clearQuickNotes();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('autosaves markdown content for the current route', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, delay: null });
    setCurrentUrl('/apps/autosave');

    render(<QuickNotes />);

    const toggle = await screen.findByRole('button', { name: /quick notes/i });
    await user.click(toggle);

    const editor = await screen.findByLabelText(/quick notes markdown editor/i);
    await user.type(editor, 'Autosave works');

    await act(async () => {
      await jest.advanceTimersByTimeAsync(900);
    });

    await waitFor(async () => {
      const record = await getNoteForRoute('/apps/autosave');
      expect(record?.content).toBe('Autosave works');
    });
  });

  it('indexes notes so search finds the saved content', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, delay: null });
    setCurrentUrl('/apps/search');

    render(<QuickNotes />);

    const toggle = await screen.findByRole('button', { name: /quick notes/i });
    await user.click(toggle);

    const editor = await screen.findByLabelText(/quick notes markdown editor/i);
    await user.type(editor, 'Kali Linux portfolio notes');
    expect(editor).toHaveValue('Kali Linux portfolio notes');

    await act(async () => {
      await jest.advanceTimersByTimeAsync(900);
    });

    await waitFor(async () => {
      const note = await getNoteForRoute('/apps/search');
      expect(note?.content).toContain('portfolio');
    });

    const search = await screen.findByLabelText(/search notes/i);
    await user.type(search, 'portfolio');

    await waitFor(() => {
      expect(screen.getAllByText('/apps/search')[0]).toBeInTheDocument();
      expect(screen.getByText(/portfolio/i)).toBeInTheDocument();
    });

    const results = await searchQuickNotes('portfolio');
    expect(results[0]?.route).toBe('/apps/search');
  });

  it('scopes notes by route so content does not bleed between pages', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, delay: null });
    setCurrentUrl('/apps/first');

    render(<QuickNotes />);

    const toggle = await screen.findByRole('button', { name: /quick notes/i });
    await user.click(toggle);

    const editor = await screen.findByLabelText(/quick notes markdown editor/i);
    await user.type(editor, 'First route content');

    await act(async () => {
      await jest.advanceTimersByTimeAsync(900);
    });

    await waitFor(async () => {
      const record = await getNoteForRoute('/apps/first');
      expect(record?.content).toBe('First route content');
    });

    await act(async () => {
      await navigate('/apps/second');
    });

    const secondEditor = await screen.findByLabelText(/quick notes markdown editor/i);
    expect(secondEditor).toHaveValue('');

    await user.type(secondEditor, 'Second route content');

    await act(async () => {
      await jest.advanceTimersByTimeAsync(900);
    });

    await waitFor(async () => {
      const firstNote = await getNoteForRoute('/apps/first');
      const secondNote = await getNoteForRoute('/apps/second');
      expect(firstNote?.content).toBe('First route content');
      expect(secondNote?.content).toBe('Second route content');
    });
  });
});
