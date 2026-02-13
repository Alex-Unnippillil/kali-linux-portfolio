import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExternalDocsLink from '../components/common/ExternalDocsLink';

const STORAGE_KEY = 'external-docs:preferences';

describe('ExternalDocsLink', () => {
  let openSpy: jest.SpyInstance<Window | null, [url?: string | URL | undefined, target?: string | undefined, features?: string | undefined]>;
  let root: HTMLDivElement;

  beforeEach(() => {
    openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    localStorage.clear();
    document.body.innerHTML = '';
    root = document.createElement('div');
    root.setAttribute('id', '__next');
    document.body.appendChild(root);
  });

  afterEach(() => {
    openSpy.mockRestore();
    root.remove();
  });

  it('stores a domain preference when remembering the choice and bypasses the dialog afterwards', () => {
    const { getByRole } = render(
      <ExternalDocsLink href="https://example.com/docs">External docs</ExternalDocsLink>,
      { container: root }
    );

    const link = getByRole('link', { name: 'External docs' });
    fireEvent.click(link);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const rememberToggle = screen.getByLabelText('Remember my choice');
    fireEvent.click(rememberToggle);

    fireEvent.click(screen.getByRole('button', { name: 'Open link' }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    const openedUrl = openSpy.mock.calls[0][0] as string;
    expect(openedUrl).toContain('https://example.com/docs');
    expect(openedUrl).toContain('utm_source=');

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.domain['example.com']).toBe(true);

    openSpy.mockClear();
    fireEvent.click(link);

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('allows remembering a single URL and skips confirmation for subsequent visits', () => {
    const href = 'https://docs.example.com/path?view=full';
    const { getByRole } = render(
      <ExternalDocsLink href={href}>Docs only</ExternalDocsLink>,
      { container: root }
    );

    const link = getByRole('link', { name: 'Docs only' });
    fireEvent.click(link);

    const rememberToggle = screen.getByLabelText('Remember my choice');
    fireEvent.click(rememberToggle);

    const linkScope = screen.getByLabelText('Remember for this exact link');
    fireEvent.click(linkScope);

    fireEvent.click(screen.getByRole('button', { name: 'Open link' }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    const openedUrl = openSpy.mock.calls[0][0] as string;
    expect(openedUrl).toContain('utm_campaign=');
    expect(openedUrl).toContain('view=full');

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.url[href]).toBe(true);
    expect(stored.domain).toEqual({});

    openSpy.mockClear();
    fireEvent.click(link);

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
