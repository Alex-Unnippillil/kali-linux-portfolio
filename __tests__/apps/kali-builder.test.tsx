import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import KaliBuilder from '../../components/apps/kali-builder';

describe('Kali Builder form', () => {
  test('requires base image', () => {
    render(<KaliBuilder />);
    fireEvent.click(screen.getByText(/build/i));
    expect(screen.getByText(/base image is required/i)).toBeInTheDocument();
  });

  test('requires at least one metapackage', () => {
    render(<KaliBuilder />);
    fireEvent.change(screen.getByLabelText(/base image/i), {
      target: { value: 'kali-rolling' },
    });
    fireEvent.click(screen.getByText(/build/i));
    expect(
      screen.getByText(/select at least one metapackage/i)
    ).toBeInTheDocument();
  });
});
