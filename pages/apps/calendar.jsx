import dynamic from 'next/dynamic';

const CalendarApp = dynamic(
  () =>
    import('../../apps/calendar').catch((error) => {
      console.error('Failed to load Calendar app', error);
      throw error;
    }),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  },
);

export default CalendarApp;
