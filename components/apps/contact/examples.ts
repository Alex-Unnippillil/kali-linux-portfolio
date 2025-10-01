import { InlineExampleSet } from '../../common/InlineExamples';

export const contactExampleSets: InlineExampleSet[] = [
  {
    id: 'security-outreach',
    title: 'Security research outreach',
    description:
      'Kickstart a conversation about a project, collaboration, or vulnerability research update.',
    examples: [
      {
        id: 'research-collab',
        label: 'Collaborative research invite',
        description:
          'Introduce your team, outline the scope of the research, and suggest a call to explore the fit.',
        metadata: 'Focus: Purple team simulations',
        values: {
          name: 'Jordan Patel',
          email: 'jordan.patel@defenselab.test',
          message:
            "Hi Alex,\n\nI'm leading a purple team exercise in Q3 focused on adversary emulation and would love to compare notes on your tooling. Are you available next week for a 30 minute call to trade approaches and see if there’s a collaboration opportunity?\n\nThanks!",
        },
      },
      {
        id: 'conference-talk',
        label: 'Conference speaking request',
        description:
          'Share event logistics, the target audience, and what talk format you have in mind.',
        metadata: 'Event: Blue Summit Europe',
        values: {
          name: 'Amelia Rossi',
          email: 'amelia.rossi@bluesummit.events',
          message:
            "Hello Alex,\n\nI curate the Blue Summit Europe security conference and we’d be thrilled to feature a session on your recent malware triage workflows. We’re hosting in Berlin on 24 October. Would you be open to a 40 minute talk plus Q&A?\n\nHappy to share a briefing deck if helpful.\n\nWarm regards,",
        },
      },
    ],
  },
  {
    id: 'project-updates',
    title: 'Portfolio and project check-ins',
    description:
      'Use these snippets to request availability or share feedback about the desktop experience.',
    examples: [
      {
        id: 'availability',
        label: 'Availability for a build review',
        metadata: 'Timeline: Next two weeks',
        values: {
          name: 'Taylor Nguyen',
          email: 'taylor.nguyen@cybersim.studio',
          message:
            "Hi Alex,\n\nWe’ve been piloting your Kali desktop experience with a cohort of analysts and have a few ideas to expand the workflow panes. Could we grab some time the week of 12 August for a quick review?\n\nAppreciate your time!",
        },
      },
      {
        id: 'product-feedback',
        label: 'Product feedback summary',
        description: 'Summarise observations from a recent user session and ask for next steps.',
        values: {
          name: 'Morgan Lee',
          email: 'morgan.lee@secopscollective.test',
          message:
            "Hello Alex,\n\nOur SecOps Collective meetup just wrapped a hands-on with your incident response workspace. Highlights: the notebook sync is a hit, and a quick filter for cloud providers would be stellar. Could we share a short write-up and explore a follow-up workshop?\n\nCheers,",
        },
      },
    ],
  },
];

export default contactExampleSets;
