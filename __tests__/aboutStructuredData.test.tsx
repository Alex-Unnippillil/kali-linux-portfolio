import React from 'react';

jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { cleanup, render } from '@testing-library/react';
import AboutApp from '../components/apps/About';

describe('AboutApp structured data', () => {
  afterEach(() => {
    cleanup();
    document.head.innerHTML = '';
  });

  it('renders JSON-LD describing the person and projects', () => {
    const { container } = render(<AboutApp />);
    const script = container.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');

    expect(script).not.toBeNull();

    const structured = JSON.parse(script?.textContent ?? '{}');

    expect(structured['@graph']).toBeDefined();
    expect(structured).toMatchSnapshot();
  });
});
