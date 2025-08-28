import React from 'react';
import { render, screen } from '@testing-library/react';
import ReadLaterList from '../components/apps/chrome/ReadLaterList';
describe('ReadLaterList', () => {
    beforeEach(() => {
        localStorage.clear();
    });
    it('displays saved articles with title and excerpt', () => {
        localStorage.setItem('read-later-items', JSON.stringify([{ title: 'A', url: '/a', excerpt: 'excerpt' }]));
        render(<ReadLaterList />);
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('excerpt')).toBeInTheDocument();
    });
});
