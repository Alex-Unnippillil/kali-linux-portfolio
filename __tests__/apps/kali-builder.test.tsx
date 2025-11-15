import { render, screen, fireEvent } from '@testing-library/react';
import KaliBuilder from '../../pages/apps/kali-builder';

describe('Kali Builder form', () => {
  it('validates required fields', () => {
    render(<KaliBuilder />);

    fireEvent.click(screen.getByText('Build'));
    expect(screen.getByRole('alert')).toHaveTextContent('Base image is required');

    fireEvent.change(screen.getByTestId('base-image'), { target: { value: 'kali-rolling' } });
    fireEvent.click(screen.getByText('Build'));
    expect(screen.getByRole('alert')).toHaveTextContent('Select at least one metapackage');

    fireEvent.click(screen.getByTestId('meta-core'));
    fireEvent.click(screen.getByText('Build'));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
