jest.mock('@xterm/xterm', () => ({
    Terminal: jest.fn().mockImplementation(() => ({
        open: jest.fn(),
        focus: jest.fn(),
        loadAddon: jest.fn(),
        write: jest.fn(),
        writeln: jest.fn(),
        onData: jest.fn(),
        onKey: jest.fn(),
        dispose: jest.fn(),
        clear: jest.fn(),
    })),
}), { virtual: true });
jest.mock('@xterm/addon-fit', () => ({
    FitAddon: jest.fn().mockImplementation(() => ({ fit: jest.fn() })),
}), { virtual: true });
jest.mock('@xterm/addon-search', () => ({
    SearchAddon: jest.fn().mockImplementation(() => ({
        activate: jest.fn(),
        dispose: jest.fn(),
    })),
}), { virtual: true });
jest.mock('@xterm/xterm/css/xterm.css', () => ({}), { virtual: true });
jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
import React, { createRef, act } from 'react';
import { render } from '@testing-library/react';
import Terminal from '../components/apps/terminal';
describe('Terminal component', () => {
    const addFolder = jest.fn();
    const openApp = jest.fn();
    it('renders xterm container and exposes imperative api', () => {
        const ref = createRef();
        const { getByTestId } = render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp}/>);
        expect(getByTestId('xterm-container')).toBeInTheDocument();
        expect(ref.current).toBeTruthy();
        expect(typeof ref.current.runCommand).toBe('function');
        expect(typeof ref.current.getContent).toBe('function');
        expect(typeof ref.current.getCommand).toBe('function');
        expect(typeof ref.current.historyNav).toBe('function');
    });
    it('runs pwd command successfully', () => {
        const ref = createRef();
        render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp}/>);
        act(() => {
            ref.current.runCommand('pwd');
        });
        expect(ref.current.getContent()).toContain('/home/alex');
    });
    it('handles invalid cd command', () => {
        const ref = createRef();
        render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp}/>);
        act(() => {
            ref.current.runCommand('cd nowhere');
        });
        expect(ref.current.getContent()).toContain("bash: cd: nowhere: No such file or directory");
    });
    it('supports history, clear, and help commands', () => {
        const ref = createRef();
        render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp}/>);
        act(() => {
            ref.current.runCommand('pwd');
            ref.current.runCommand('history');
        });
        expect(ref.current.getContent()).toContain('pwd');
        act(() => {
            ref.current.runCommand('clear');
        });
        expect(ref.current.getContent()).toContain('pwd');
        act(() => {
            ref.current.runCommand('help');
        });
        expect(ref.current.getContent()).toContain('Available commands:');
        expect(ref.current.getContent()).toContain('clear');
        expect(ref.current.getContent()).toContain('help');
    });
    it('handles missing Worker gracefully', () => {
        const ref = createRef();
        const originalWorker = global.Worker;
        global.Worker = undefined;
        render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp}/>);
        act(() => {
            ref.current.runCommand('simulate');
        });
        expect(ref.current.getContent()).toContain('Web Workers are not supported');
        global.Worker = originalWorker;
    });
    it('sends simulate command to worker and logs result', () => {
        const ref = createRef();
        const originalWorker = global.Worker;
        const postMessageMock = jest.fn();
        const mockWorkerInstance = {
            onmessage: null,
            postMessage: (msg) => {
                postMessageMock(msg);
                mockWorkerInstance.onmessage?.({ data: 'Simulation complete' });
            },
            terminate: jest.fn(),
        };
        global.Worker = jest.fn(() => mockWorkerInstance);
        render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp}/>);
        act(() => {
            ref.current.runCommand('simulate');
        });
        expect(postMessageMock).toHaveBeenCalledWith({ command: 'simulate' });
        expect(ref.current.getContent()).toContain('Simulation complete');
        global.Worker = originalWorker;
    });
    it('navigates command history with arrow keys', () => {
        const ref = createRef();
        render(<Terminal ref={ref} addFolder={addFolder} openApp={openApp}/>);
        act(() => {
            ref.current.runCommand('pwd');
            ref.current.historyNav('up');
        });
        expect(ref.current.getCommand()).toBe('pwd');
        act(() => {
            ref.current.historyNav('down');
        });
        expect(ref.current.getCommand()).toBe('');
    });
});
