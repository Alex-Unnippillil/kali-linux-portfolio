import dynamic from 'next/dynamic';

const ScrollableTimeline = dynamic(
  () =>
    import('../components/ScrollableTimeline').catch((err) => {
      console.error('Failed to load ScrollableTimeline', err);
      throw err;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-center text-sm text-gray-400">Loading timeline…</div>
    ),
  }
);

const ProfilePage = () => (
  <main className="min-h-screen p-4 bg-gray-900 text-white">
    <h1 className="mb-4 text-2xl">Timeline</h1>
    <ScrollableTimeline />
  </main>
);

export default ProfilePage;
