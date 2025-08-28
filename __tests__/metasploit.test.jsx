import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MetasploitApp from '../components/apps/metasploit';
describe('Metasploit app', () => {
    beforeEach(() => {
        // @ts-ignore
        global.fetch = jest.fn();
        localStorage.clear();
    });
    it('does not fetch modules in demo mode', () => {
        render(<MetasploitApp demoMode/>);
        expect(global.fetch).not.toHaveBeenCalled();
    });
    it('shows transcript when module selected', () => {
        render(<MetasploitApp demoMode/>);
        const moduleEl = screen.getByRole('button', {
            name: /ms17_010_eternalblue/,
        });
        fireEvent.click(moduleEl);
        expect(screen.getByText(/Exploit completed/)).toBeInTheDocument();
    });
    it('shows legal banner', () => {
        render(<MetasploitApp demoMode/>);
        expect(screen.getByText(/authorized security testing and educational use only/i)).toBeInTheDocument();
    });
    it('outputs demo logs', () => {
        render(<MetasploitApp demoMode/>);
        fireEvent.click(screen.getByText('Run Demo'));
        expect(screen.getByText(/Started reverse TCP handler/)).toBeInTheDocument();
    });
});
