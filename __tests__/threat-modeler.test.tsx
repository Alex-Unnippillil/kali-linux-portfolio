import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ThreatModeler from '@apps/threat-modeler';

describe('ThreatModeler', () => {
  it('adds and moves nodes with keyboard', () => {
    const { getByText } = render(<ThreatModeler />);
    fireEvent.click(getByText('Add Node'));
    const node = getByText('Node 1');
    fireEvent.click(node);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(node.style.transform).toContain('30px');
  });
});
