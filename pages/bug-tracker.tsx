import DesktopLayout from '../components/desktop/DesktopLayout';

export default function BugTracker() {
  return (
    <DesktopLayout title="Bug Tracker">
      <div className="p-4">
        <h1 className="text-xl font-bold">Bug Tracker</h1>
        <p>Track and manage project issues from this page.</p>
      </div>
    </DesktopLayout>
  );
}

