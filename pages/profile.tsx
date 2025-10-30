import Meta from '../components/SEO/Meta';
import ScrollableTimeline from '../components/ScrollableTimeline';

const aboutJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'About Alex Unnippillil',
    url: 'https://unnippillil.com/profile',
    description:
      'Learn about Alex Unnippillil’s security journey through a scrollable timeline of training, certifications, and highlight projects.',
    about: {
      '@type': 'Person',
      name: 'Alex Unnippillil',
    },
  },
];

const ProfilePage = () => (
  <>
    <Meta
      title="About"
      description="Trace Alex Unnippillil’s cybersecurity growth, training milestones, and featured accomplishments in an interactive timeline."
      canonical="/profile"
      jsonLd={aboutJsonLd}
    />
    <main className="min-h-screen p-4 bg-gray-900 text-white">
      <h1 className="mb-4 text-2xl">Timeline</h1>
      <ScrollableTimeline />
    </main>
  </>
);

export default ProfilePage;
