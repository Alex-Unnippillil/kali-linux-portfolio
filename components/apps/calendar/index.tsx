import dynamic from 'next/dynamic';

const CalendarApp = dynamic(
  () =>
    import('../../../apps/calendar').catch((error) => {
      console.error('Failed to load Calendar app', error);
      throw error;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
        Loading calendar…
      </div>
    ),
  },
);

export default function CalendarWrapper() {
  return <CalendarApp />;
}

export const displayCalendar = () => <CalendarWrapper />;
