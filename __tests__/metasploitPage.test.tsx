import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MetasploitPage from '../apps/metasploit';
import { ToasterProvider } from '../components/ui/Toaster';

describe('Metasploit page module filtering', () => {
  it('filters modules by search and shows tags', () => {
    render(
      <ToasterProvider>
        <MetasploitPage />
      </ToasterProvider>,
    );

    // expand tree to reveal a known module
    fireEvent.click(screen.getAllByText('auxiliary')[0]);
    fireEvent.click(screen.getAllByText('admin')[0]);
    fireEvent.click(screen.getAllByText('2wire')[0]);
    expect(screen.getByText('xslt_password_reset')).toBeInTheDocument();

    // search hides the module
    fireEvent.change(screen.getAllByPlaceholderText('Search modules')[0], {
      target: { value: 'nonexistent-module' },
    });
    expect(screen.queryByText('xslt_password_reset')).toBeNull();

    // tag buttons are rendered
    expect(screen.getByRole('button', { name: 'admin' })).toBeInTheDocument();
  });
});
