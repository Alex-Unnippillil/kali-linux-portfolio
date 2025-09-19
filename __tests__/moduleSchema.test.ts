import modules from '../modules/metadata';

describe('module metadata schema', () => {
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
      },
    ]);
  });
});
