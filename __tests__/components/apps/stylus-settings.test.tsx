import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import StylusSettingsApp from '../../../components/apps/stylus-settings';
import { SettingsProvider, STYLUS_GLOBAL_MAPPING_ID } from '../../../hooks/useSettings';

const createStorage = (): Storage => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
};

describe('StylusSettingsApp', () => {
  beforeEach(() => {
    const storage = createStorage();
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });
    localStorage.clear();
  });

  const renderApp = () =>
    render(
      <SettingsProvider>
        <StylusSettingsApp />
      </SettingsProvider>
    );

  it('records pressure metrics from the test canvas', async () => {
    renderApp();
    const canvas = screen.getByLabelText('Stylus pressure test area');
    jest
      .spyOn(canvas, 'getBoundingClientRect')
      .mockReturnValue({
        width: 360,
        height: 200,
        top: 0,
        left: 0,
        bottom: 200,
        right: 360,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect);

    fireEvent.pointerDown(canvas, {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      pressure: 0.7,
    });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    await waitFor(() => {
      expect(screen.getAllByText('0.50')).toHaveLength(2);
    });
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('switches presets and restores defaults', () => {
    renderApp();
    const select = screen.getByLabelText('Curve preset');
    expect(screen.getByText(/Linear pressure response/i)).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'soft' } });
    expect(
      screen.getByText(/Requires firmer press near the start/i)
    ).toBeInTheDocument();

    const resetButton = screen.getByRole('button', { name: /reset curve/i });
    fireEvent.click(resetButton);

    expect(screen.getByText(/Linear pressure response/i)).toBeInTheDocument();
  });

  it('persists per-app button mappings and responds to focus events', async () => {
    renderApp();
    const appInput = screen.getByPlaceholderText('App ID');
    fireEvent.change(appInput, { target: { value: 'paint-app' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    const primarySelect = screen.getByLabelText('Primary button');
    fireEvent.change(primarySelect, { target: { value: 'pan' } });

    await waitFor(() => {
      expect((primarySelect as HTMLSelectElement).value).toBe('pan');
    });

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('kali:window-focus', { detail: { appId: 'paint-app' } })
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Active mapping · Primary: pan · Secondary: eyedropper · Eraser: erase/i)
      ).toBeInTheDocument();
    });

    const targetSelect = screen.getByLabelText('Target app');
    fireEvent.change(targetSelect, { target: { value: STYLUS_GLOBAL_MAPPING_ID } });
    expect((targetSelect as HTMLSelectElement).value).toBe(STYLUS_GLOBAL_MAPPING_ID);
  });
});
