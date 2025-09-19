import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider, useLocale } from '../hooks/useLocale';
import QuickSettings from '../components/ui/QuickSettings';

describe('LocaleProvider', () => {
  const LocaleProbe = () => {
    const { t, locale, setLocale } = useLocale();
    return (
      <div>
        <div data-testid="label">{t('whisker.buttonLabel')}</div>
        <div data-testid="active-locale">{locale}</div>
        <button type="button" onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}>
          toggle
        </button>
      </div>
    );
  };

  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it('switches translations at runtime without reloading the page', async () => {
    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );

    expect(await screen.findByTestId('label')).toHaveTextContent('Applications');
    await userEvent.click(screen.getByRole('button', { name: /toggle/i }));

    await waitFor(() => {
      expect(screen.getByTestId('label')).toHaveTextContent('Aplicaciones');
    });
  });

  it('persists the selected locale for future sessions', async () => {
    const { unmount } = render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );

    await screen.findByTestId('label');
    await userEvent.click(screen.getByRole('button', { name: /toggle/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem('desktop-locale')).toBe('es');
    });

    unmount();

    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('label')).toHaveTextContent('Aplicaciones');
      expect(screen.getByTestId('active-locale')).toHaveTextContent('es');
    });
  });

  it('does not emit warnings when toggling locales', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );

    await screen.findByTestId('label');
    await userEvent.click(screen.getByRole('button', { name: /toggle/i }));
    await waitFor(() => {
      expect(screen.getByTestId('label')).toHaveTextContent('Aplicaciones');
    });

    await userEvent.click(screen.getByRole('button', { name: /toggle/i }));
    await waitFor(() => {
      expect(screen.getByTestId('label')).toHaveTextContent('Applications');
    });

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

describe('QuickSettings layout', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('reserves space to avoid layout shifts when locale changes', async () => {
    render(
      <LocaleProvider>
        <QuickSettings open />
      </LocaleProvider>,
    );

    const panel = await screen.findByTestId('quick-settings-panel');
    expect(panel).toHaveStyle({ minWidth: '18rem' });

    const wrapper = screen.getByTestId('locale-select-wrapper');
    expect(wrapper).toHaveStyle({ minWidth: '8.5rem' });
  });
});
