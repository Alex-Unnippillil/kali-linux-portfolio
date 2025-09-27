import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

const loadWeatherApp = () =>
  import('../../apps/weather').catch((err) => {
    console.error('Failed to load Weather app', err);
    throw err;
  });

export default createSuspenseAppPage(loadWeatherApp, {
  appName: 'Weather Dashboard',
});
