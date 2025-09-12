import ScrollableTimeline from '../components/ScrollableTimeline';
import TerminalCard from '../components/terminal/TerminalCard';

const ProfilePage = () => (
  <main className="min-h-screen p-4 bg-gray-900 text-white space-y-4">
    <TerminalCard title="Timeline" content="Explore professional milestones" />
    <ScrollableTimeline />
  </main>
);

export default ProfilePage;
