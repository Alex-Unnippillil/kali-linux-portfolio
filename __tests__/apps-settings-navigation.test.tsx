import { render, screen, within } from '@testing-library/react';
import SettingsPage from '../apps/settings/index';
import { SettingsProvider } from '../hooks/useSettings';

jest.mock('../apps/settings/components/BackgroundSlideshow', () => () => (
  <div data-testid="background-slideshow" />
));

jest.mock('../apps/settings/components/KeymapOverlay', () =>
  function MockKeymapOverlay({ open }: { open: boolean }) {
    if (!open) return null;
    return <div data-testid="keymap-overlay" />;
  }
);

class IntersectionObserverMock implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor() {}

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

describe('Settings app navigation', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: IntersectionObserverMock,
    });
  });

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      writable: true,
      value: jest.fn(),
    });
  });

  function renderPage() {
    return render(
      <SettingsProvider>
        <SettingsPage />
      </SettingsProvider>
    );
  }

  it('renders sticky navigation with section headings and helper text', async () => {
    renderPage();

    const navigation = screen.getByRole('navigation', {
      name: /settings sections/i,
    });
    expect(
      within(navigation).getByRole('button', { name: /Appearance/i })
    ).toHaveAttribute('aria-current', 'true');
    expect(
      within(navigation).getByRole('button', { name: /Background/i })
    ).toBeInTheDocument();
    expect(
      within(navigation).getByRole('button', { name: /Shortcuts/i })
    ).toBeInTheDocument();
    expect(
      within(navigation).getByRole('button', { name: /Privacy & Data/i })
    ).toBeInTheDocument();

    expect(
      await screen.findByRole('heading', { name: /Appearance/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Background/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Accessibility/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Shortcuts/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Privacy & Data/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Themes adjust the global window chrome/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Slide to cycle through curated wallpapers/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Minimize animations for smoother performance/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Opens the shortcut editor overlay/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Export saves a JSON file containing your theme/i)
    ).toBeInTheDocument();
  });
});
