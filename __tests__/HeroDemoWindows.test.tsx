import { render, screen } from '@testing-library/react';
import HeroDemoWindows from '../components/HeroDemoWindows';
import { SettingsContext } from '../hooks/useSettings';

jest.mock('react-draggable', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

describe('HeroDemoWindows', () => {
  it('does not render when disabled', () => {
    render(
      <SettingsContext.Provider value={{ heroDemos: false } as any}>
        <HeroDemoWindows />
      </SettingsContext.Provider>
    );
    expect(screen.queryByText(/Demo Terminal/)).toBeNull();
  });

  it('renders windows when enabled', () => {
    render(
      <SettingsContext.Provider value={{ heroDemos: true } as any}>
        <HeroDemoWindows />
      </SettingsContext.Provider>
    );
    expect(screen.getByText(/Demo Terminal/)).toBeInTheDocument();
  });
});
