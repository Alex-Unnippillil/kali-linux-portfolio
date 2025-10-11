import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

jest.mock('../../../utils/analytics', () => ({
  logEvent: jest.fn(),
}));

import { Resume, RESUME_FEED_URL } from '../../../components/apps/alex';
import { logEvent } from '../../../utils/analytics';

describe('About Alex resume widget', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('loads resume data from the JSON feed and renders skill chips', async () => {
    const remoteResume = {
      skills: [{ name: 'Deep Packet Inspection', category: 'Networking' }],
      projects: [],
      experience: [],
    };

    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => remoteResume } as any);

    render(
      <Resume data={{ skills: [], projects: [], experience: [] }} />
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe(RESUME_FEED_URL);
    expect(options).toMatchObject({ headers: { Accept: 'application/json' } });
    expect(options.signal).toBeDefined();

    expect(await screen.findByText('Deep Packet Inspection')).toBeInTheDocument();
  });

  it('emits analytics when a project link is opened', async () => {
    const remoteResume = {
      skills: [],
      projects: [
        {
          name: 'Cyber Security Dictionary',
          link: 'https://example.com/dictionary',
          summary: 'Glossary of security terms.',
          tags: ['Security'],
        },
      ],
      experience: [],
    };

    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => remoteResume } as any);

    render(
      <Resume data={{ skills: [], projects: [], experience: [] }} />
    );

    const projectLink = await screen.findByRole('link', {
      name: 'Cyber Security Dictionary',
    });

    fireEvent.click(projectLink);

    expect(logEvent).toHaveBeenCalledWith({
      category: 'Resume',
      action: 'open_project',
      label: 'Cyber Security Dictionary',
    });
  });
});
