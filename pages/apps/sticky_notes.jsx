import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

export default createSuspenseAppPage(() => import('../../apps/sticky_notes'), {
  appName: 'Sticky Notes',
});
