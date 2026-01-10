import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AllApplications from '../components/screen/all-applications';

describe('AllApplications title highlighting', () => {
    const baseApps = [
        { id: 'calc', title: 'Calculator', icon: '/calc.png' },
        { id: 'cafe', title: 'Café Tools', icon: '/cafe.png' },
    ];

    const renderComponent = () =>
        render(<AllApplications apps={baseApps} games={[]} openApp={jest.fn()} />);

    it('does not render highlights when the query is empty', async () => {
        renderComponent();
        expect(screen.getByText('Calculator')).toBeInTheDocument();
        expect(screen.queryByText('Calculator', { selector: 'mark' })).toBeNull();
        expect(screen.getByText('Café Tools')).toBeInTheDocument();
        expect(screen.queryByText('Café Tools', { selector: 'mark' })).toBeNull();
    });

    it('wraps matching substrings in <mark> elements and removes them when cleared', async () => {
        renderComponent();
        const input = screen.getByLabelText('Search applications');
        fireEvent.change(input, { target: { value: 'calc' } });

        const highlighted = await screen.findByText('Calc', { selector: 'mark' });
        expect(highlighted).toBeInTheDocument();
        expect(highlighted).toHaveTextContent('Calc');

        fireEvent.change(input, { target: { value: '' } });
        await waitFor(() => {
            expect(screen.queryByText('Calc', { selector: 'mark' })).toBeNull();
        });
    });

    it('highlights matches regardless of case or accents', async () => {
        renderComponent();
        const input = screen.getByLabelText('Search applications');
        fireEvent.change(input, { target: { value: 'CAFÉ' } });

        const highlighted = await screen.findByText('Café', { selector: 'mark' });
        expect(highlighted).toBeInTheDocument();
        expect(highlighted).toHaveTextContent('Café');
    });
});
