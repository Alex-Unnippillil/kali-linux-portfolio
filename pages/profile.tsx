import ScrollableTimeline from '../components/ScrollableTimeline';

const ProfilePage = () => (
  <section
    aria-labelledby="timeline-heading"
    className="min-h-screen p-4 bg-gray-900 text-white"
  >
    <h1 id="timeline-heading" className="mb-4 text-2xl">
      Timeline
    </h1>
    <ScrollableTimeline />
  </section>
);

export default ProfilePage;
