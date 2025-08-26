import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import NiktoApp, { linkifyCVEs } from '../components/apps/nikto';

describe('Nikto templates', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(window, 'prompt').mockReturnValue('tpl1');
  });

  afterEach(() => {
    (window.prompt as jest.Mock).mockRestore();
  });

  it('saves and loads templates', () => {
    const { unmount } = render(<NiktoApp />);
    fireEvent.change(screen.getByPlaceholderText('http://example.com'), { target: { value: 'http://test' } });
    fireEvent.change(screen.getByPlaceholderText('Options'), { target: { value: '--ssl' } });
    fireEvent.click(screen.getByText('Save Template'));

    const stored = JSON.parse(localStorage.getItem('niktoTemplates') || '[]');
    expect(stored).toEqual([{ name: 'tpl1', target: 'http://test', options: '--ssl' }]);

    unmount();
    render(<NiktoApp />);
    fireEvent.change(screen.getByTestId('template-select'), { target: { value: 'tpl1' } });

    expect((screen.getByPlaceholderText('http://example.com') as HTMLInputElement).value).toBe('http://test');
    expect((screen.getByPlaceholderText('Options') as HTMLInputElement).value).toBe('--ssl');
  });
});

describe('linkifyCVEs', () => {
  it('wraps CVE identifiers in links', () => {
    const output = linkifyCVEs('Issue CVE-2023-1234 found');
    expect(output).toContain(
      '<a href="https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2023-1234" target="_blank" rel="noreferrer">CVE-2023-1234</a>',
    );
  });
});
