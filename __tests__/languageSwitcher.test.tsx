import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import { SettingsProvider } from '../hooks/useSettings';
import { __resetForTests, useI18n } from '../hooks/useI18n';

const TestConsumer = () => {
  const { t } = useI18n();
  return <div data-testid="locale-text">{t('settings.language.instructions')}</div>;
};

beforeEach(() => {
  const store: Record<string, string> = {};
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach((key) => delete store[key]);
      },
    } as Storage,
  });
  window.localStorage.clear();
  __resetForTests();
});

test('changing the language updates translations and persists the selection', async () => {
  const user = userEvent.setup();

  render(
    <SettingsProvider>
      <LanguageSwitcher />
      <TestConsumer />
    </SettingsProvider>,
  );

  const localeText = await screen.findByTestId('locale-text');
  expect(localeText).toHaveTextContent('Choose the language for your desktop.');

  await waitFor(() => expect(window.localStorage.getItem('locale')).toBe('en'));
  const spanishOption = screen.getByRole('radio', { name: /español/i });
  await user.click(spanishOption);

  await waitFor(() => expect(window.localStorage.getItem('locale')).toBe('es'));
  await waitFor(() =>
    expect(screen.getByTestId('locale-text')).toHaveTextContent(
      'Elige el idioma de tu escritorio.',
    ),
  );
  expect(window.localStorage.getItem('locale')).toBe('es');
});

test('stored locale is applied on mount without user interaction', async () => {
  const user = userEvent.setup();

  const { unmount } = render(
    <SettingsProvider>
      <LanguageSwitcher />
      <TestConsumer />
    </SettingsProvider>,
  );

  const frenchOption = await screen.findByRole('radio', { name: /français/i });
  await user.click(frenchOption);

  await waitFor(() => expect(window.localStorage.getItem('locale')).toBe('fr'));
  await waitFor(() =>
    expect(screen.getByTestId('locale-text')).toHaveTextContent(
      'Choisissez la langue de votre bureau.',
    ),
  );

  unmount();

  render(
    <SettingsProvider>
      <TestConsumer />
    </SettingsProvider>,
  );

  await waitFor(() =>
    expect(screen.getByTestId('locale-text')).toHaveTextContent(
      'Choisissez la langue de votre bureau.',
    ),
  );
});
