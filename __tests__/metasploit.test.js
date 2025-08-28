import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MetasploitApp from '../components/apps/metasploit';
import { jsx as _jsx } from "react/jsx-runtime";
describe('Metasploit app', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    localStorage.clear();
  });
  it('does not fetch modules in demo mode', () => {
    render(/*#__PURE__*/_jsx(MetasploitApp, {
      demoMode: true
    }));
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('shows transcript when module selected', () => {
    render(/*#__PURE__*/_jsx(MetasploitApp, {
      demoMode: true
    }));
    const moduleEl = screen.getByRole('button', {
      name: /ms17_010_eternalblue/
    });
    fireEvent.click(moduleEl);
    expect(screen.getByText(/Exploit completed/)).toBeInTheDocument();
  });
  it('shows legal banner', () => {
    render(/*#__PURE__*/_jsx(MetasploitApp, {
      demoMode: true
    }));
    expect(screen.getByText(/authorized security testing and educational use only/i)).toBeInTheDocument();
  });
  it('outputs demo logs', () => {
    render(/*#__PURE__*/_jsx(MetasploitApp, {
      demoMode: true
    }));
    fireEvent.click(screen.getByText('Run Demo'));
    expect(screen.getByText(/Started reverse TCP handler/)).toBeInTheDocument();
  });
});
