import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AllApplications from '../../components/screen/all-applications';

describe('AllApplications keyboard navigation', () => {
  const originalInnerWidth = window.innerWidth;

  const apps = [
    { id: 'terminal', title: 'Terminal', icon: '/icons/terminal.png' },
    { id: 'files', title: 'Files', icon: '/icons/files.png' },
    { id: 'settings', title: 'Settings', icon: '/icons/settings.png' },
    { id: 'resource-monitor', title: 'Resource Monitor', icon: '/icons/resource.png' },
    { id: 'screen-recorder', title: 'Screen Recorder', icon: '/icons/screen.png' },
    { id: 'trash', title: 'Trash', icon: '/icons/trash.png' },
  ];

  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 768,
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: originalInnerWidth,
    });
  });

  it('assigns a roving tab index across app tiles', async () => {
    render(<AllApplications apps={apps} games={[]} openApp={jest.fn()} />);

    const files = await screen.findByRole('button', { name: 'Files' });
    const resourceMonitor = await screen.findByRole('button', { name: 'Resource Monitor' });

    await waitFor(() => {
      expect(files).toHaveAttribute('tabindex', '0');
      expect(resourceMonitor).toHaveAttribute('tabindex', '-1');
    });

    const user = userEvent.setup();
    files.focus();
    await user.keyboard('{ArrowRight}');

    await waitFor(() => {
      expect(resourceMonitor).toHaveFocus();
      expect(resourceMonitor).toHaveAttribute('tabindex', '0');
      expect(files).toHaveAttribute('tabindex', '-1');
    });

    await user.keyboard('{ArrowLeft}');

    await waitFor(() => {
      expect(files).toHaveFocus();
      expect(files).toHaveAttribute('tabindex', '0');
      expect(resourceMonitor).toHaveAttribute('tabindex', '-1');
    });
  });

  it('supports vertical arrow navigation with wrapping', async () => {
    render(<AllApplications apps={apps} games={[]} openApp={jest.fn()} />);

    const files = await screen.findByRole('button', { name: 'Files' });
    const terminal = await screen.findByRole('button', { name: 'Terminal' });
    const resourceMonitor = await screen.findByRole('button', { name: 'Resource Monitor' });
    const trash = await screen.findByRole('button', { name: 'Trash' });

    const user = userEvent.setup();
    files.focus();
    await user.keyboard('{ArrowDown}');

    await waitFor(() => {
      expect(terminal).toHaveFocus();
    });

    await user.keyboard('{ArrowDown}');

    await waitFor(() => {
      expect(files).toHaveFocus();
    });

    await user.keyboard('{ArrowRight}');

    await waitFor(() => {
      expect(resourceMonitor).toHaveFocus();
    });

    await user.keyboard('{ArrowDown}');

    await waitFor(() => {
      expect(trash).toHaveFocus();
    });

    await user.keyboard('{ArrowUp}');

    await waitFor(() => {
      expect(resourceMonitor).toHaveFocus();
    });
  });
});
