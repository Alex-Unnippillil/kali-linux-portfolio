import ScrollableTimeline from '../../components/ScrollableTimeline';

export const metadata = {
  title: 'Timeline | Kali Linux Portfolio',
};

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="mb-4 text-2xl">Timeline</h1>
      <ScrollableTimeline />
    </main>
  );
}
