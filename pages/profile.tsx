import ScrollableTimeline from '@client/ScrollableTimeline';

const ProfilePage = () => (
  <main className="min-h-screen p-4 bg-gray-900 text-white">
    <h1 className="mb-4 text-2xl">Timeline</h1>
    <ScrollableTimeline />
  </main>
);

export default ProfilePage;
