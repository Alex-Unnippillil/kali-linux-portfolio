import modules from '../modules/metadata';

describe('modules metadata', () => {
  it('matches the current module metadata', () => {
    expect(modules).toEqual([
      {
        name: 'getsystem',
        description: 'Attempt to elevate your privilege to that of local system.',
        tags: ['privilege', 'elevation'],
        options: [
          {
            name: 'SESSION',
            required: true,
            description: 'The session to run this module on.',
          },
        ],
        docPath: '/docs/modules/getsystem.md',
      },
      {
        name: 'keyscan_start',
        description: 'Start capturing keystrokes.',
        tags: ['keylogging'],
        options: [
          {
            name: 'SESSION',
            required: true,
            description: 'The session to run this module on.',
          },
        ],
        docPath: '/docs/modules/keyscan_start.md',
      },
      {
        name: 'persistence_service',
        description: 'Achieve persistence by installing a service.',
        tags: ['persistence', 'service'],
        options: [
          {
            name: 'SESSION',
            required: true,
            description: 'The session to run this module on.',
          },
          {
            name: 'RPORT',
            required: false,
            description: 'Remote port used for callback.',
          },
        ],
        docPath: '/docs/modules/persistence_service.md',
      },
      {
        name: 'hashdump',
        description: 'Dump password hashes from the SAM database.',
        tags: ['credentials', 'dump'],
        options: [
          {
            name: 'SESSION',
            required: true,
            description: 'The session to run this module on.',
          },
        ],
        docPath: '/docs/modules/hashdump.md',
      },
    ]);
  });
});
