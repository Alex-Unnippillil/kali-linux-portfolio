import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Reader from '../components/apps/chrome/Reader';
import { jsx as _jsx } from "react/jsx-runtime";
const sampleHtml = `<!DOCTYPE html><html><head><title>t</title></head><body><article><h1>Sample</h1><p>Content here</p></article></body></html>`;
const writeTextMock = jest.fn();
describe('Reader', () => {
  beforeEach(() => {
    global.fetch = jest.fn(async () => ({
      text: async () => sampleHtml
    }));
    writeTextMock.mockClear();
  });
  it('parses same-origin pages', async () => {
    render(/*#__PURE__*/_jsx(Reader, {
      url: "/test"
    }));
    expect(await screen.findByText('Sample')).toBeInTheDocument();
  });
  it('shows fallback on cross-origin', async () => {
    render(/*#__PURE__*/_jsx(Reader, {
      url: "https://example.com"
    }));
    expect(await screen.findByText(/Cross-origin content cannot be loaded/i)).toBeInTheDocument();
  });
  it('copies markdown', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock
      },
      configurable: true
    });
    render(/*#__PURE__*/_jsx(Reader, {
      url: "/test"
    }));
    await screen.findByText('Sample');
    await user.click(screen.getByText('Copy as Markdown'));
    expect(writeTextMock).toHaveBeenCalled();
  });
});
