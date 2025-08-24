import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BadgeList from '../components/BadgeList';

describe('BadgeList component', () => {
  const badges = [
    { label: 'TypeScript', src: '/ts', alt: 'ts', description: 'TS' },
    { label: 'JavaScript', src: '/js', alt: 'js', description: 'JS' },
  ];

  test('filters badges and displays details', () => {
    render(<BadgeList badges={badges} />);

    const input = screen.getByPlaceholderText('Filter skills');
    fireEvent.change(input, { target: { value: 'type' } });

    expect(screen.getByAltText('ts')).toBeInTheDocument();
    expect(screen.queryByAltText('js')).toBeNull();

    fireEvent.click(screen.getByAltText('ts'));
    expect(screen.getByText('TS')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByText('TS')).toBeNull();
  });
});
