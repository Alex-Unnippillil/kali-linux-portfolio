import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Breadcrumbs from '../components/ui/Breadcrumbs';

const buildPath = () => [
  { name: '/' },
  { name: 'home' },
  { name: 'projects' },
];

describe('Breadcrumbs', () => {
  it('focuses the path input when entering edit mode', () => {
    render(<Breadcrumbs path={buildPath()} onNavigate={jest.fn()} />);

    const nav = screen.getByLabelText(/breadcrumb/i);
    fireEvent.click(nav);

    const input = screen.getByRole('textbox', { name: /current path/i });
    expect(input).toHaveFocus();
    expect(input).toHaveValue('/home/projects');
  });

  it('navigates to a matched path when submitted', () => {
    const onNavigate = jest.fn();
    render(<Breadcrumbs path={buildPath()} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByLabelText(/breadcrumb/i));
    const input = screen.getByRole('textbox', { name: /current path/i });
    fireEvent.change(input, { target: { value: '/home' } });

    const form = input.closest('form');
    expect(form).not.toBeNull();
    if (form) {
      fireEvent.submit(form);
    }

    expect(onNavigate).toHaveBeenCalledWith(1);
    expect(screen.queryByRole('textbox', { name: /current path/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/breadcrumb/i)).toBeInTheDocument();
  });

  it('shows an error and retains focus for invalid paths', () => {
    const onNavigate = jest.fn();
    render(<Breadcrumbs path={buildPath()} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByLabelText(/breadcrumb/i));
    const input = screen.getByRole('textbox', { name: /current path/i });
    fireEvent.change(input, { target: { value: '/unknown' } });

    const form = input.closest('form');
    expect(form).not.toBeNull();
    if (form) {
      fireEvent.submit(form);
    }

    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid path/i);
    expect(input).toHaveFocus();
  });

  it('keeps breadcrumb navigation working when clicking segments', () => {
    const onNavigate = jest.fn();
    render(<Breadcrumbs path={buildPath()} onNavigate={onNavigate} />);

    const crumb = screen.getByRole('button', { name: 'home' });
    fireEvent.click(crumb);

    expect(onNavigate).toHaveBeenCalledWith(1);
    expect(screen.queryByRole('textbox', { name: /current path/i })).not.toBeInTheDocument();
  });
});
