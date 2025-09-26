import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

export default createSuspenseAppPage(() => import('../../apps/minesweeper'), {
  appName: 'Minesweeper',
});
