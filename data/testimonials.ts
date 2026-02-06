export interface Testimonial {
  id: string;
  name: string;
  role: string;
  relationship: string;
  avatar: string;
  snippet: string;
  content: string;
  pullQuote: string;
  source?: {
    url: string;
    label: string;
  };
}

export const testimonials: Testimonial[] = [
  {
    id: 'jane-doe',
    name: 'Jane Doe',
    role: 'CTO, ACME Corp',
    relationship: 'Former Manager',
    avatar: 'https://avatars.githubusercontent.com/u/583231?v=4',
    snippet: 'Kali consistently delivered high-quality security insights.',
    content:
      'Kali consistently delivered high-quality security insights and took initiative to strengthen our infrastructure. Their blend of curiosity and accountability made them a pivotal team member during critical projects.',
    pullQuote:
      '“Kali’s blend of curiosity and accountability strengthened our infrastructure.”',
    source: {
      url: 'https://www.linkedin.com/in/janedoe',
      label: 'LinkedIn',
    },
  },
  {
    id: 'john-smith',
    name: 'John Smith',
    role: 'Security Researcher, Example Labs',
    relationship: 'Conference Peer',
    avatar: 'https://avatars.githubusercontent.com/u/9919?v=4',
    snippet: 'I met Kali at DEF CON where their demo stood out.',
    content:
      'I met Kali at DEF CON where their demo stood out for clarity and impact. They made complex exploit chains understandable for newcomers and veterans alike.',
    pullQuote:
      '“Their DEF CON demo made complex exploit chains understandable.”',
  },
];
