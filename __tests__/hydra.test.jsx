import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import HydraApp from '../components/apps/hydra';
describe('Hydra wordlists', () => {
    beforeEach(() => {
        localStorage.clear();
    });
    it('persists added wordlists in localStorage', async () => {
        class MockFileReader {
            constructor() {
                this.onload = null;
            }
            readAsText() {
                if (this.onload)
                    this.onload({ target: { result: 'user\n' } });
            }
        }
        // @ts-ignore
        global.FileReader = MockFileReader;
        const file = new File(['user\n'], 'users.txt', { type: 'text/plain' });
        const { unmount } = render(<HydraApp />);
        fireEvent.change(screen.getByTestId('user-file-input'), {
            target: { files: [file] },
        });
        await screen.findByText('users.txt', { selector: 'li' });
        unmount();
        render(<HydraApp />);
        expect(screen.getAllByText('users.txt').length).toBeGreaterThan(0);
    });
});
describe('Hydra pause and resume', () => {
    beforeEach(() => {
        localStorage.setItem('hydraUserLists', JSON.stringify([{ name: 'u', content: 'a' }]));
        localStorage.setItem('hydraPassLists', JSON.stringify([{ name: 'p', content: 'b' }]));
    });
    it('pauses and resumes cracking progress', async () => {
        let runResolve = () => { };
        // @ts-ignore
        global.fetch = jest.fn((url, options) => {
            if (options && options.body && options.body.includes('action')) {
                return Promise.resolve({ json: async () => ({}) });
            }
            return new Promise((resolve) => {
                runResolve = () => resolve({ json: async () => ({ output: '' }) });
            });
        });
        render(<HydraApp />);
        fireEvent.change(screen.getByPlaceholderText('192.168.0.1'), {
            target: { value: '1.1.1.1' },
        });
        fireEvent.click(screen.getByText('Run Hydra'));
        const pauseBtn = await screen.findByTestId('pause-button');
        fireEvent.click(pauseBtn);
        expect(global.fetch).toHaveBeenCalledWith('/api/hydra', expect.objectContaining({ body: JSON.stringify({ action: 'pause' }) }));
        const resumeBtn = await screen.findByTestId('resume-button');
        fireEvent.click(resumeBtn);
        expect(global.fetch).toHaveBeenCalledWith('/api/hydra', expect.objectContaining({ body: JSON.stringify({ action: 'resume' }) }));
        await act(async () => {
            runResolve();
        });
    });
});
