import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Breadcrumbs from '../components/ui/Breadcrumbs';

describe('Breadcrumbs', () => {
  it('renders a home button that navigates to the root directory', () => {
    const onNavigate = jest.fn();
    render(
      <Breadcrumbs
        path={[
          { name: 'root' },
          { name: 'Documents' },
        ]}
        onNavigate={onNavigate}
      />
    );

    const homeButton = screen.getByRole('button', { name: /Home/ });
    fireEvent.click(homeButton);
    expect(onNavigate).toHaveBeenCalledWith(0);
  });

  it('collapses middle segments into an accessible overflow menu', () => {
    const onNavigate = jest.fn();
    const path = [
      { name: 'root' },
      { name: 'Projects' },
      { name: 'ClientA' },
      { name: 'Reports' },
      { name: '2024' },
      { name: 'Q1' },
    ];
    render(<Breadcrumbs path={path} onNavigate={onNavigate} />);

    const overflowToggle = screen.getByRole('button', { name: 'Show hidden folders' });
    expect(overflowToggle).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ClientA/ })).not.toBeInTheDocument();

    fireEvent.click(overflowToggle);
    const clientButton = screen.getByRole('menuitem', { name: /ClientA/ });
    fireEvent.click(clientButton);

    expect(onNavigate).toHaveBeenCalledWith(2);
    expect(screen.queryByRole('menuitem', { name: /ClientA/ })).not.toBeInTheDocument();
  });

  it('marks the current location using aria-current', () => {
    const path = [
      { name: 'root' },
      { name: 'Projects' },
      { name: 'ClientA' },
    ];
    render(<Breadcrumbs path={path} onNavigate={jest.fn()} />);

    const current = screen.getByRole('button', { name: /ClientA/ });
    expect(current).toHaveAttribute('aria-current', 'page');
  });
});
