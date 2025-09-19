import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ContactApp from '@/apps/contact';
import DummyForm from '@/pages/dummy-form';
import HydraPreview from '@/pages/hydra-preview';

const dummyKey = 'dummy-form-draft';
const contactKey = 'contact-draft';
const hydraKey = 'hydra-preview-draft';

describe('draft autosave forms', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('restores and clears dummy form draft', () => {
    const payload = {
      data: { name: 'Jane', email: 'jane@example.com', message: 'Hello' },
      savedAt: Date.now(),
    };
    window.localStorage.setItem(dummyKey, JSON.stringify(payload));

    render(<DummyForm />);

    expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hello')).toBeInTheDocument();
    expect(screen.getByText(/Saved|Recovered draft/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear draft/i }));

    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe('');
    expect(window.localStorage.getItem(dummyKey)).toBeNull();
  });

  it('debounces dummy form updates to storage', () => {
    render(<DummyForm />);

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Draft User' },
    });

    act(() => {
      jest.advanceTimersByTime(2100);
    });

    const stored = window.localStorage.getItem(dummyKey);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.data.name).toBe('Draft User');
  });

  it('restores and clears hydra wizard draft', () => {
    const payload = {
      data: {
        step: 2,
        target: 'example.com',
        protocol: 'ftp',
        wordlist: '/tmp/wordlist.txt',
      },
      savedAt: Date.now(),
    };
    window.localStorage.setItem(hydraKey, JSON.stringify(payload));

    render(<HydraPreview />);

    expect(screen.getByDisplayValue('/tmp/wordlist.txt')).toBeInTheDocument();
    expect(screen.getByText(/Saved|Recovered draft/)).toBeInTheDocument();
    expect(screen.getByLabelText('Wordlist Path')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(screen.getByDisplayValue('example.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear draft/i }));

    expect(window.localStorage.getItem(hydraKey)).toBeNull();
    expect(screen.getByLabelText('Target Host')).toBeInTheDocument();
    expect((screen.getByLabelText('Target Host') as HTMLInputElement).value).toBe('');
  });

  it('restores and clears contact form draft', () => {
    const payload = {
      data: { name: 'Alex', email: 'alex@example.com', message: 'Ping' },
      savedAt: Date.now(),
    };
    window.localStorage.setItem(contactKey, JSON.stringify(payload));

    render(<ContactApp />);

    expect(screen.getByDisplayValue('Alex')).toBeInTheDocument();
    expect(screen.getByDisplayValue('alex@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ping')).toBeInTheDocument();
    expect(screen.getByText(/Saved|Recovered draft/)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /clear draft/i })[0]);

    expect(window.localStorage.getItem(contactKey)).toBeNull();
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe('');
  });
});

