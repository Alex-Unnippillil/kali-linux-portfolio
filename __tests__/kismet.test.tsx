import React from 'react';
import { render, screen } from '@testing-library/react';
import KismetApp from '../components/apps/kismet.jsx';

describe('KismetApp', () => {
  it('renders file input', () => {
    render(<KismetApp />);
    expect(screen.getByLabelText(/upload pcap file/i)).toBeInTheDocument();
  });
});
