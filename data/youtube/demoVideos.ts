export interface DemoYouTubeVideo {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnail: string;
}

export const demoYouTubeVideos: DemoYouTubeVideo[] = [
  {
    id: '1s7LCHZJ2O8',
    title: 'Kali Linux Essentials: Build a Custom Pen-Testing Lab',
    description:
      'Walk through the process of configuring a Kali Linux lab with VirtualBox, networking tips, and safe testing practices.',
    channelTitle: 'Cyber Lessons',
    publishedAt: '2023-07-12T00:00:00Z',
    thumbnail: 'https://i.ytimg.com/vi/1s7LCHZJ2O8/hqdefault.jpg',
  },
  {
    id: '7U-RbOKanWA',
    title: 'Reverse Shell Workshop: Debugging Payloads',
    description:
      'Learn how reverse shells operate, how to test them safely, and the tooling Kali Linux ships to inspect network activity.',
    channelTitle: 'Lab Mode',
    publishedAt: '2022-11-04T00:00:00Z',
    thumbnail: 'https://i.ytimg.com/vi/7U-RbOKanWA/hqdefault.jpg',
  },
  {
    id: 'yJFzYjeW2Fk',
    title: 'Capture the Flag Breakdown: Forensics Challenge',
    description:
      'A step-by-step walkthrough of a realistic CTF forensic challenge using tools available in Kali Linux.',
    channelTitle: 'Flag Files',
    publishedAt: '2024-02-18T00:00:00Z',
    thumbnail: 'https://i.ytimg.com/vi/yJFzYjeW2Fk/hqdefault.jpg',
  },
  {
    id: 'xg5XkGyxVq0',
    title: 'Wireshark Deep Dive: Visualising Packet Data',
    description:
      'Use Wireshark to capture, filter, and analyse packet traces without touching production networks.',
    channelTitle: 'Packet Stories',
    publishedAt: '2023-09-29T00:00:00Z',
    thumbnail: 'https://i.ytimg.com/vi/xg5XkGyxVq0/hqdefault.jpg',
  },
  {
    id: 'dKeXdmz7s8g',
    title: 'OSINT Playbook: Automating Recon Workflows',
    description:
      'Build a repeatable open-source intelligence workflow with Kali-friendly tooling and reporting tips.',
    channelTitle: 'Recon Notes',
    publishedAt: '2021-08-17T00:00:00Z',
    thumbnail: 'https://i.ytimg.com/vi/dKeXdmz7s8g/hqdefault.jpg',
  },
  {
    id: 'n3pY5KFXhHE',
    title: 'Metasploit Basics: Modules, Payloads, and Safety',
    description:
      'Explore Metasploit terminology, module configuration, and how to keep experiments isolated from real infrastructure.',
    channelTitle: 'Exploit Classroom',
    publishedAt: '2020-05-01T00:00:00Z',
    thumbnail: 'https://i.ytimg.com/vi/n3pY5KFXhHE/hqdefault.jpg',
  },
];
