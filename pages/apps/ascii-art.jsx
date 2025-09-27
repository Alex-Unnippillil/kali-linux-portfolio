import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

export default createSuspenseAppPage(() => import('../../apps/ascii-art'), {
  appName: 'ASCII Art',
});
