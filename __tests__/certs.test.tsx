import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Certs from '@/components/apps/certs';

// Next.js Image component needs to be mocked for tests
jest.mock('next/image', () => {
  const MockedImage = (props: any) => {
    return <img {...props} alt={props.alt || ''} />;
  };
  MockedImage.displayName = 'MockedImage';
  return MockedImage;
});

describe('Certs badge wall', () => {
  test('filters badges by selected category', () => {
    render(<Certs />);
    // AWS badge present initially
    expect(
      screen.getByText(/AWS Knowledge: File Storage/i)
    ).toBeInTheDocument();

    // choose AI category
    fireEvent.click(screen.getByRole('button', { name: 'AI' }));
    // AWS badge should be hidden
    expect(
      screen.queryByText(/AWS Knowledge: File Storage/i)
    ).not.toBeInTheDocument();
    // AI badges should be visible
    expect(
      screen.getAllByText(/Generative AI Essentials/i).length
    ).toBeGreaterThan(0);
  });
});
