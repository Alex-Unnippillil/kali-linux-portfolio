import React from 'react';
import { render } from '@testing-library/react';
import InstallOptions from '../pages/install-options';
import Avatar from '../components/ui/Avatar';
import fs from 'fs';
import path from 'path';

jest.mock('next/image', () =>
  jest.fn((props: any) => <img {...props} alt={props.alt || ''} />)
);

const Image = require('next/image') as jest.Mock;

describe('image optimization', () => {
  beforeEach(() => {
    Image.mockClear();
  });

  it('uses next/image for provider logos', () => {
    render(<InstallOptions />);
    expect(Image).toHaveBeenCalledTimes(3);
  });

  it('uses next/image for avatar', () => {
    render(<Avatar src="https://avatars.githubusercontent.com/u/1?v=4" name="octocat" />);
    expect(Image).toHaveBeenCalledTimes(1);
  });

  it('configures image formats', () => {
    const configText = fs.readFileSync(
      path.join(__dirname, '../next.config.js'),
      'utf8'
    );
    expect(configText).toMatch(/formats:\s*\['image\/avif', 'image\/webp'\]/);
  });
});
