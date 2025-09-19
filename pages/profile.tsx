import dynamic from 'next/dynamic';
import TimelineSkeleton from '../components/skeletons/TimelineSkeleton';

const ScrollableTimeline = dynamic(() => import('../components/ScrollableTimeline'), {
  ssr: false,
  loading: () => <TimelineSkeleton />,
});

const ProfilePage = () => (
  <main className="min-h-screen bg-gray-900 p-4 text-white">
    <h1 className="mb-4 text-2xl">Timeline</h1>
    <ScrollableTimeline />
  </main>
);

export default ProfilePage;
