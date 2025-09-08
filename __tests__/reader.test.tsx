import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Reader from '../components/apps/chrome/Reader';

const sampleArticle = {
  title: 't',
  content: '<h1>Sample</h1><p>Content here</p>',
  excerpt: '',
  markdown: '# t\n\nContent here',
};

const writeTextMock = jest.fn();

describe('Reader', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn(async () => ({ json: async () => sampleArticle }));
    writeTextMock.mockClear();
    localStorage.clear();
  });

  it('parses same-origin pages', async () => {
    render(<Reader url="/test" />);
    expect(await screen.findByText('Sample')).toBeInTheDocument();
  });

  it('shows fallback on cross-origin', async () => {
    render(<Reader url="https://example.com" />);
    expect(
      await screen.findByText(/Cross-origin content cannot be loaded/i)
    ).toBeInTheDocument();
  });

  it('copies markdown', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });
    render(<Reader url="/test" />);
    await screen.findByText('Sample');
    await user.click(screen.getByText('Copy as Markdown'));
    expect(writeTextMock).toHaveBeenCalled();
  });

  it('toggles markdown view and saves preference', async () => {
    const user = userEvent.setup();
    render(<Reader url="/test" />);
    await screen.findByText('Sample');
    await user.click(screen.getByText('Markdown'));
    expect(
      screen.getByText((content) => content.includes('# t'))
    ).toBeInTheDocument();
    expect(localStorage.getItem('readerView')).toBe('markdown');
  });
});
