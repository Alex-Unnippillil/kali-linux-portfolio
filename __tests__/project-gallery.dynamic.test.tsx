import React from 'react';
import { render, waitFor } from '@testing-library/react';

jest.mock('react-ga4', () => ({ event: jest.fn() }));

const importSpy = jest.fn();
jest.mock('../components/apps/project-gallery', () => {
  importSpy();
  return { __esModule: true, default: () => <div /> };
});

jest.mock('next/dynamic', () => (importer: any) => {
  return (props: any) => {
    importer();
    return null;
  };
});

describe('project gallery dynamic import', () => {
  it('loads module when screen is invoked', async () => {
    const apps = require('../apps.config.js').default;
    const entry = apps.find((app: any) => app.id === 'project-gallery');
    expect(entry).toBeDefined();
    expect(importSpy).not.toHaveBeenCalled();
    render(entry.screen(() => {}, () => {}));
    await waitFor(() => expect(importSpy).toHaveBeenCalledTimes(1));
  });
});
