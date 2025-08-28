import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import HashcatApp, { detectHashType } from '../components/apps/hashcat';
import progressInfo from '../components/apps/hashcat/progress.json';
describe('HashcatApp', () => {
    it('auto-detects hash types', () => {
        expect(detectHashType('d41d8cd98f00b204e9800998ecf8427e')).toBe('0');
        expect(detectHashType('da39a3ee5e6b4b0d3255bfef95601890afd80709')).toBe('100');
        expect(detectHashType('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')).toBe('1400');
        expect(detectHashType('$2y$10$' + 'a'.repeat(53))).toBe('3200');
    });
    it('displays benchmark results', async () => {
        const { getByText, getByTestId } = render(<HashcatApp />);
        fireEvent.click(getByText('Run Benchmark'));
        await waitFor(() => {
            expect(getByTestId('benchmark-output').textContent).toMatch(/GPU0/);
        });
    });
    it('animates attempts/sec and ETA from JSON', () => {
        jest.useFakeTimers();
        const { getByText } = render(<HashcatApp />);
        expect(getByText(`Attempts/sec: ${progressInfo.hashRate[0]}`)).toBeInTheDocument();
        act(() => {
            jest.advanceTimersByTime(1000);
        });
        expect(getByText(`Attempts/sec: ${progressInfo.hashRate[1]}`)).toBeInTheDocument();
        expect(getByText(`ETA: ${progressInfo.eta[1]}`)).toBeInTheDocument();
        expect(getByText(`Mode: ${progressInfo.mode}`)).toBeInTheDocument();
        jest.useRealTimers();
    });
    it('labels hashcat modes with example hashes', () => {
        const { getByLabelText, getByText } = render(<HashcatApp />);
        fireEvent.change(getByLabelText('Hash Type:'), { target: { value: '100' } });
        expect(getByText('Example hash: da39a3ee5e6b4b0d3255bfef95601890afd80709')).toBeInTheDocument();
    });
});
