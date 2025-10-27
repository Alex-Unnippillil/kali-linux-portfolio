import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/router';
import LanguageSwitcher from '../../components/ui/LanguageSwitcher';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

const useRouterMock = useRouter as unknown as jest.Mock;

describe('LanguageSwitcher', () => {
  let routerInstance: {
    locale: string;
    defaultLocale: string;
    locales: string[];
    pathname: string;
    asPath: string;
    query: Record<string, unknown>;
    replace: jest.Mock;
    isReady: boolean;
  };

  beforeEach(() => {
    document.body.innerHTML = '<div id="live-region" aria-live="polite"></div>';
    window.localStorage.clear();
    document.cookie = 'NEXT_LOCALE=; Max-Age=0; path=/;';
    routerInstance = {
      locale: 'en',
      defaultLocale: 'en',
      locales: ['en', 'es', 'fr'],
      pathname: '/apps',
      asPath: '/apps',
      query: {},
      replace: jest.fn().mockResolvedValue(undefined),
      isReady: true,
    };
    useRouterMock.mockReturnValue(routerInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('supports keyboard navigation and persists the selected locale', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    const button = screen.getByRole('button', { name: /language/i });
    button.focus();

    await user.keyboard('{Enter}');

    const listbox = await screen.findByRole('listbox');
    expect(listbox).toHaveAttribute('aria-activedescendant', expect.stringContaining('option-0'));

    await user.keyboard('{ArrowDown}');
    await waitFor(() =>
      expect(listbox).toHaveAttribute('aria-activedescendant', expect.stringContaining('option-1')),
    );

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(routerInstance.replace).toHaveBeenCalledWith(
        { pathname: '/apps', query: {} },
        '/apps',
        {
          locale: 'es',
          scroll: false,
        },
      );
    });

    expect(window.localStorage.getItem('preferred-locale')).toBe('es');
    expect(document.cookie).toContain('NEXT_LOCALE=es');
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('announces selections through the polite live region', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    const button = screen.getByRole('button', { name: /language/i });
    await user.click(button);

    const frenchOption = await screen.findByRole('option', { name: /French \(Français\)/i });
    await user.click(frenchOption);

    await waitFor(() => {
      expect(routerInstance.replace).toHaveBeenCalledWith(
        { pathname: '/apps', query: {} },
        '/apps',
        {
          locale: 'fr',
          scroll: false,
        },
      );
    });

    await waitFor(() => {
      const liveRegion = document.getElementById('live-region');
      expect(liveRegion?.textContent).toBe('Language changed to French (Français)');
    });
  });
});
