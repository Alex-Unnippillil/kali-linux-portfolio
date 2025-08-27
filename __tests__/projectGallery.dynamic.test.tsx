import React from 'react';
import { render, waitFor } from '@testing-library/react';

const importSpy = jest.fn();

jest.mock('next/dynamic', () => (importer: any) => {
  return () => {
    importer();
    return null;
  };
});

jest.mock('../components/apps/project-gallery', () => {
  importSpy();
  return { __esModule: true, default: () => null };
});

describe('project-gallery dynamic import', () => {
  it('loads module when screen is rendered', async () => {
    const apps = (await import('../apps.config.js')).default;
    const app = apps.find((a: any) => a.id === 'project-gallery');
    expect(importSpy).not.toHaveBeenCalled();
    const Screen = app.screen;
    render(Screen(jest.fn(), jest.fn()));
    await waitFor(() => expect(importSpy).toHaveBeenCalledTimes(1));
  });
});
