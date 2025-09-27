import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

export default createSuspenseAppPage(() => import('../../apps/tower-defense'), {
  appName: 'Tower Defense',
});
