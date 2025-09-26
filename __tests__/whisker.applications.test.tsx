import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import WhiskerMenu from '../components/menu/WhiskerMenu';

jest.mock('next/image', () => {
  const MockedImage = (props: any) => <img {...props} alt={props.alt || ''} />;
  MockedImage.displayName = 'MockedImage';
  return MockedImage;
});

jest.mock('../apps.config', () => ({
  __esModule: true,
  default: [
    { id: 'terminal', title: 'Terminal', icon: '/terminal.svg' },
    { id: 'browser', title: 'Browser', icon: '/browser.svg' },
    { id: 'chess', title: 'Chess', icon: '/chess.svg' },
  ],
  utilities: [
    { id: 'terminal', title: 'Terminal', icon: '/terminal.svg' },
  ],
  games: [
    { id: 'chess', title: 'Chess', icon: '/chess.svg' },
  ],
}));

describe('Whisker menu keyboard navigation', () => {
  let dispatchSpy: jest.SpyInstance;

  beforeEach(() => {
    const originalDispatch = window.dispatchEvent.bind(window);
    dispatchSpy = jest
      .spyOn(window, 'dispatchEvent')
      .mockImplementation(event => originalDispatch(event));
  });

  afterEach(() => {
    dispatchSpy.mockRestore();
  });

  it('opens with Alt+F1, supports navigation, and dispatches open-app on Enter', async () => {
    render(<WhiskerMenu />);

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.keyDown(window, { key: 'F1', altKey: true });

    expect(await screen.findByPlaceholderText(/search/i)).toBeInTheDocument();

    const firstApp = await screen.findByLabelText('Terminal');
    const secondApp = await screen.findByLabelText('Browser');

    expect(firstApp.parentElement).toHaveClass('ring-2');
    expect(firstApp.parentElement).toHaveClass('ring-ubb-orange');

    fireEvent.keyDown(window, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(firstApp.parentElement).not.toHaveClass('ring-2');
      expect(secondApp.parentElement).toHaveClass('ring-2');
    });

    fireEvent.keyDown(window, { key: 'Enter' });

    const openAppCalls = dispatchSpy.mock.calls.filter(
      ([event]) => event.type === 'open-app'
    );
    expect(openAppCalls).toHaveLength(1);
    const event = openAppCalls[0][0] as CustomEvent;
    expect(event.type).toBe('open-app');
    expect(event.detail).toBe('browser');
  });
});
