import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';

import BeefPage from '../apps/beef/index';

jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockedImage({ priority: _priority, src, alt, ...rest }: any) {
    return <img src={typeof src === 'string' ? src : ''} alt={alt ?? ''} {...rest} />;
  },
}));

const enableLab = () => {
  fireEvent.click(screen.getByRole('checkbox', { name: /self-contained/i }));
  fireEvent.click(screen.getByRole('button', { name: /enable lab mode/i }));
};

describe('BeEF desktop window dashboard', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('renders summary metrics and scenario walkthroughs', () => {
    render(<BeefPage />);

    expect(screen.getByText(/Active hooks/i)).toBeInTheDocument();
    expect(screen.getByText(/Modules loaded/i)).toBeInTheDocument();
    expect(screen.getByText(/Lab safety/i)).toBeInTheDocument();

    const walkthroughCards = screen.getAllByRole('article');
    expect(walkthroughCards).toHaveLength(3);
    expect(walkthroughCards[0]).toHaveTextContent(/Reconnaissance/i);
  });

  test('displays module risk and command history after enabling lab mode', () => {
    render(<BeefPage />);
    enableLab();

    const hookList = screen.getByRole('list', { name: /Hooked clients/i });
    expect(within(hookList).getAllByRole('button')).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: /Training Portal/i }));
    const moduleExplorer = screen.getByRole('list', { name: /module explorer/i });
    expect(moduleExplorer).toHaveTextContent(/Low risk/i);

    fireEvent.change(screen.getByRole('combobox', { name: /module/i }), { target: { value: 'network-scan' } });
    fireEvent.click(screen.getByRole('button', { name: /run command/i }));
    const history = screen.getByRole('list', { name: /command history/i });
    expect(within(history).getByText(/Network discovery returns lab placeholder hosts/i)).toBeInTheDocument();
  });
});

