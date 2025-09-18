import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AllApps } from '../components/screen/side_bar';
import AllApplications from '../components/screen/all-applications';

jest.mock('next/image', () => {
  const MockImage = (props: any) => <img {...props} alt={props.alt} />;
  MockImage.displayName = 'NextImageMock';
  return MockImage;
});

describe('Launcher accessibility', () => {
  it('AllApps button exposes launcher state', () => {
    const onClick = jest.fn();
    render(<AllApps showApps={onClick} isOpen={false} />);
    const button = screen.getByRole('button', { name: /open application launcher/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', 'application-launcher');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('AllApplications overlay is announced as a dialog', () => {
    render(<AllApplications apps={[]} games={[]} openApp={jest.fn()} />);
    const dialog = screen.getByRole('dialog', { name: /application launcher/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('searchbox', { name: /search applications/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /available applications/i })).toBeInTheDocument();
  });
});
