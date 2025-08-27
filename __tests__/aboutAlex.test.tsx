import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { About } from '../components/apps/alex';
jest.mock('react-markdown', () => (props: any) => <>{props.children}</>);
import fs from 'fs';
import path from 'path';

const bio = fs.readFileSync(path.join(__dirname, '../components/apps/alex/about.md'), 'utf8');

beforeEach(() => {
  // @ts-ignore
  global.fetch = jest.fn().mockResolvedValue({ text: () => Promise.resolve(bio) });
});

describe('About markdown and copy actions', () => {
  it('renders markdown biography', async () => {
    render(<About />);
    expect(await screen.findByText(/Technology Enthusiast/i)).toBeInTheDocument();
  });

  it('copies contact info', () => {
    const writeText = jest.fn();
    // @ts-ignore
    Object.assign(navigator, { clipboard: { writeText } });
    render(<About />);
    fireEvent.click(screen.getByRole('button', { name: /copy email/i }));
    fireEvent.click(screen.getByRole('button', { name: /copy phone/i }));
    expect(writeText).toHaveBeenCalledWith('alex.unnippillil@hotmail.com');
    expect(writeText).toHaveBeenCalledWith('123-456-7890');
  });
});
