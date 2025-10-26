import { MediaItem, Playlist } from './types';

export const MEDIA_LIBRARY: MediaItem[] = [
  {
    id: 'kali-field-manual',
    title: 'Kali Field Manual: Triage Essentials',
    description:
      'A guided tour through the Kali desktop, terminal shortcuts, and the workflows used during incident response triage.',
    duration: '12:34',
    format: 'video',
    url: 'https://example.com/media/kali-field-manual',
    tags: ['workflow', 'basics', 'triage'],
    published: '2024-01-04',
  },
  {
    id: 'wireless-recon',
    title: 'Wireless Recon Live Lab',
    description:
      'Streamed walk-through of gathering wireless intelligence safely using simulated APs and replay captures.',
    duration: '26:18',
    format: 'livestream',
    url: 'https://example.com/media/wireless-recon',
    tags: ['wireless', 'recon', 'simulation'],
    published: '2023-11-19',
  },
  {
    id: 'purple-team-digest',
    title: 'Purple Team Digest – Episode 14',
    description:
      'Podcast recap covering log analysis tactics and how the lab automates alert enrichment in the Kali workspace.',
    duration: '18:02',
    format: 'audio',
    url: 'https://example.com/media/purple-team-digest',
    tags: ['podcast', 'defense'],
    published: '2023-12-08',
  },
  {
    id: 'memory-forensics-cookbook',
    title: 'Memory Forensics Cookbook',
    description:
      'Hands-on demonstration of carving volatile evidence with Volatility and visualizing artifacts using the built-in heatmap.',
    duration: '32:45',
    format: 'video',
    url: 'https://example.com/media/memory-forensics-cookbook',
    tags: ['forensics', 'memory'],
    published: '2024-02-12',
  },
  {
    id: 'web-lab-simulation',
    title: 'Web Lab Simulation: Harden the Stack',
    description:
      'Scenario-based challenge that walks through patch triage, reverse proxy hardening, and monitoring updates.',
    duration: '24:11',
    format: 'clip',
    url: 'https://example.com/media/web-lab-simulation',
    tags: ['web', 'hardening'],
    published: '2024-03-05',
  },
  {
    id: 'reporting-blueprint',
    title: 'Reporting Blueprint Workshop',
    description:
      'Workshop on collecting findings across the desktop apps and assembling them into a concise incident briefing.',
    duration: '15:09',
    format: 'video',
    url: 'https://example.com/media/reporting-blueprint',
    tags: ['reporting', 'process'],
    published: '2023-09-28',
  },
  {
    id: 'radar-quick-wins',
    title: 'Radar Quick Wins – Threat Intel Highlights',
    description:
      'Five minute round-up of notable detection wins, curated from the simulated SOC event feed.',
    duration: '05:12',
    format: 'clip',
    url: 'https://example.com/media/radar-quick-wins',
    tags: ['intel', 'highlights'],
    published: '2024-01-26',
  },
  {
    id: 'playbook-design-lab',
    title: 'Playbook Design Lab',
    description:
      'Long-form lab session that stitches together automation, reporting, and post-mortem workflows using the portfolio apps.',
    duration: '41:07',
    format: 'livestream',
    url: 'https://example.com/media/playbook-design-lab',
    tags: ['automation', 'workflow'],
    published: '2023-10-13',
  },
];

const timestamp = new Date().toISOString();

export const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: 'daily-brief',
    name: 'Daily Brief',
    items: [
      { mediaId: 'radar-quick-wins' },
      { mediaId: 'kali-field-manual' },
      { mediaId: 'reporting-blueprint' },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: 'deep-dive',
    name: 'Deep Dive Lab',
    items: [
      { mediaId: 'memory-forensics-cookbook' },
      { mediaId: 'playbook-design-lab' },
      { mediaId: 'wireless-recon' },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];
