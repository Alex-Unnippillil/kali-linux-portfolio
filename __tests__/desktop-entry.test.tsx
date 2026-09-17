import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from '../pages/index';

jest.mock('next/router', () => ({ useRouter: () => ({ isReady: true, query: { overview: '1' } }) }));
jest.mock('next/dynamic', () => () => function DesktopMock() { return <div data-testid="operating-system" />; });
jest.mock('../components/SEO/Meta', () => () => null);

test('the OS is the homepage even with the old reading-mode URL and preferences', () => {
  localStorage.setItem('kali-portfolio:entry', 'overview');
  render(<Home />);
  expect(screen.getByTestId('operating-system')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Enter the desktop' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Portfolio overview' })).not.toBeInTheDocument();
});
