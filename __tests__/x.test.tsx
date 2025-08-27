import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import XApp from '../components/apps/x';
import fs from 'fs';
import path from 'path';

jest.mock('next/script', () => ({
  __esModule: true,
  default: ({ onLoad }: any) => {
    if (onLoad) {
      onLoad();
    }
    return null;
  },
}));

describe('XApp timeline', () => {
  beforeEach(() => {
    (window as any).twttr = { widgets: { createTimeline: jest.fn(() => Promise.resolve()) } };
    localStorage.clear();
  });

  it('renders timeline after script load', () => {
    render(<XApp />);
    expect((window as any).twttr.widgets.createTimeline).toHaveBeenCalled();
  });

  it('reloads timeline when handle changes', () => {
    render(<XApp />);
    (window as any).twttr.widgets.createTimeline.mockClear();
    fireEvent.change(screen.getByPlaceholderText(/profile or owner\/list/i), {
      target: { value: 'jack' },
    });
    const form = screen.getByRole('button', { name: /load/i }).closest('form');
    fireEvent.submit(form!);
    expect((window as any).twttr.widgets.createTimeline).toHaveBeenCalledWith(
      expect.objectContaining({ screenName: 'jack' }),
      expect.anything(),
      expect.any(Object)
    );
    expect(localStorage.getItem('x-handle')).toBe('jack');
  });
});

describe('CSP configuration', () => {
  it('contains required Twitter origins', () => {
    const config = fs.readFileSync(path.join(process.cwd(), 'next.config.js'), 'utf8');
    expect(config).toContain('https://platform.twitter.com');
    expect(config).toContain('https://syndication.twitter.com');
    expect(config).toContain('https://cdn.syndication.twimg.com');
    expect(config).toContain('https://*.twitter.com');
    expect(config).toContain('https://*.x.com');
  });
});
