import React from 'react';
import { render, waitFor } from '@testing-library/react';
import AllApplications from '../components/screen/all-applications';

jest.mock('../components/base/ubuntu_app', () => ({
  __esModule: true,
  default: ({ name }: { name: string }) => <div>{name}</div>,
}));

const originalMatchMedia = window.matchMedia;

const createMatchMedia = (matches: boolean) => {
  return jest.fn().mockReturnValue({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  });
};

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe('AllApplications motion preferences', () => {
  it('omits overlay animation when reduced motion is preferred', async () => {
    window.matchMedia = createMatchMedia(true) as unknown as typeof window.matchMedia;

    const { container } = render(
      <AllApplications
        apps={[{ id: 'demo', title: 'Demo', icon: '/demo.png' }]}
        games={[]}
        openApp={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(container.firstChild).not.toHaveClass('all-apps-anim');
    });
  });
});
