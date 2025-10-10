import React from 'react';
import { render, screen } from '@testing-library/react';
import AllApplications from '../../components/screen/all-applications';

describe('AllApplications grouping', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('uses alphabetical ranges for grouped sections', async () => {
        const apps = [
            { id: 'alpha', title: 'Alpha', icon: './icons/alpha.png' },
            { id: 'bravo', title: 'Bravo', icon: './icons/bravo.png' },
            { id: 'charlie', title: 'Charlie', icon: './icons/charlie.png' },
            { id: 'delta', title: 'Delta', icon: './icons/delta.png' },
            { id: 'echo', title: 'Echo', icon: './icons/echo.png' },
            { id: 'foxtrot', title: 'Foxtrot', icon: './icons/foxtrot.png' },
            { id: 'golf', title: 'Golf', icon: './icons/golf.png' },
            { id: 'hotel', title: 'Hotel', icon: './icons/hotel.png' },
            { id: 'india', title: 'India', icon: './icons/india.png' },
            { id: 'juliet', title: 'Juliet', icon: './icons/juliet.png' },
        ];

        render(
            <AllApplications apps={apps} games={[]} openApp={jest.fn()} />
        );

        expect(
            await screen.findByRole('heading', { name: 'Apps A – I' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Apps J' })
        ).toBeInTheDocument();
    });
});

