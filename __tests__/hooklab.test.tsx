import React from 'react';
import { render, screen } from '@testing-library/react';
import HookLab from '../apps/beef/components/HookLab';

describe('HookLab', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BEEF_URL;
  });

  it('uses env URL when provided', () => {
    process.env.NEXT_PUBLIC_BEEF_URL = 'https://example.com';
    render(<HookLab />);
    const iframe = screen.getByTitle('Hook Lab');
    expect(iframe).toHaveAttribute('src', 'https://example.com');
  });

  it('falls back to local demo when env var missing', () => {
    render(<HookLab />);
    const iframe = screen.getByTitle('Hook Lab');
    expect(iframe).toHaveAttribute('srcdoc');
  });
});
