import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Timeline from '../components/Timeline';

describe('Timeline', () => {
  const events = [
    { date: '2020', title: 'Start', description: 'desc', skills: ['JS'] },
    { date: '2021', title: 'Next', description: 'desc', skills: ['TS'] },
  ];

  it('supports arrow key navigation and emits skill events', () => {
    const handler = jest.fn();
    window.addEventListener('skill-filter', handler);
    render(<Timeline events={events} />);
    const items = screen.getAllByRole('listitem');
    items[0].focus();
    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.click(screen.getByText('JS'));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: 'JS' }));
    window.removeEventListener('skill-filter', handler);
  });
});
