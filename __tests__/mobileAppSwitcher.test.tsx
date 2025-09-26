import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileAppSwitcher from '../components/screen/mobile-app-switcher';

jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img {...props} /> }));

describe('MobileAppSwitcher', () => {
  it('cycles between windows and calls onSelect', () => {
    const onSelect = jest.fn();
    const onOpenApps = jest.fn();
    const onOpenSwitcher = jest.fn();
    render(
      <MobileAppSwitcher
        windows={[
          { id: 'terminal', title: 'Terminal', icon: '/terminal.png' },
          { id: 'browser', title: 'Browser', icon: '/browser.png' },
          { id: 'editor', title: 'Editor', icon: '/editor.png' },
        ]}
        activeId="browser"
        onSelect={onSelect}
        onOpenApplications={onOpenApps}
        onOpenSwitcher={onOpenSwitcher}
      />
    );

    expect(screen.getByRole('button', { name: /switch window \(browser\)/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next app/i }));
    expect(onSelect).toHaveBeenCalledWith('editor');

    fireEvent.click(screen.getByRole('button', { name: /previous app/i }));
    expect(onSelect).toHaveBeenCalledWith('terminal');

    fireEvent.click(screen.getByRole('button', { name: /show applications/i }));
    expect(onOpenApps).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /switch window/i }));
    expect(onOpenSwitcher).toHaveBeenCalled();
  });

  it('disables controls when no windows are open', () => {
    const onSelect = jest.fn();
    const onOpenApps = jest.fn();
    const onOpenSwitcher = jest.fn();
    render(
      <MobileAppSwitcher
        windows={[]}
        activeId={null}
        onSelect={onSelect}
        onOpenApplications={onOpenApps}
        onOpenSwitcher={onOpenSwitcher}
      />
    );

    expect(screen.getByRole('button', { name: /previous app/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next app/i })).toBeDisabled();

    const switcherButton = screen.getByRole('button', { name: /no apps open/i });
    expect(switcherButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /show applications/i }));
    expect(onOpenApps).toHaveBeenCalled();
    expect(onOpenSwitcher).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
