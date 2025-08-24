import { render, screen } from '@testing-library/react';
import LazyGitHubButton from '../components/LazyGitHubButton';

class MockIntersectionObserver {
  private callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe() {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as any);
  }
  disconnect() {}
}

// @ts-ignore
global.IntersectionObserver = MockIntersectionObserver;

describe('LazyGitHubButton', () => {
  it('renders GitHub iframe on intersection', async () => {
    render(<LazyGitHubButton user="alex" repo="repo" />);
    const iframe = await screen.findByTitle('repo-star');
    expect(iframe).toBeInTheDocument();
  });
});
