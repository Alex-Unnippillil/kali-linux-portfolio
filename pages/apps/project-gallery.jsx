import createSuspenseAppPage from '../../utils/createSuspenseAppPage';

export default createSuspenseAppPage(() => import('../../apps/project-gallery/pages'), {
  appName: 'Project Gallery',
});
