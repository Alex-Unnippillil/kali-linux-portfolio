import {
  PlanStepState,
  RunPlanModule,
  SerializedStep,
  serializePlan,
  validatePlan,
} from './RunPlan';

describe('RunPlan validation', () => {
  const modules: RunPlanModule[] = [
    {
      name: 'auxiliary/admin/2wire/xslt_password_reset',
      description: 'Reset router admin password and gain admin access.',
      type: 'auxiliary',
      options: {
        RHOSTS: { desc: 'Target address range', required: true },
        RPORT: { desc: 'Target port', default: 80 },
      },
    },
    {
      name: 'auxiliary/admin/appletv/appletv_display_video',
      description: 'Display a custom video on AppleTV devices.',
      type: 'auxiliary',
    },
    {
      name: 'auxiliary/admin/backupexec/dump',
      description: 'Download arbitrary files through Backup Exec agent.',
      type: 'auxiliary',
    },
  ];

  it('flags missing module selections', () => {
    const steps: PlanStepState[] = [
      { id: 'step-0', moduleName: '', options: {} },
    ];

    const errors = validatePlan(steps, modules);

    expect(errors).toEqual([
      expect.objectContaining({
        stepIndex: 0,
        type: 'module',
      }),
    ]);
  });

  it('requires artifacts from earlier steps when chaining modules', () => {
    const steps: PlanStepState[] = [
      {
        id: 'step-0',
        moduleName: 'auxiliary/admin/appletv/appletv_display_video',
        options: {},
      },
    ];

    const errors = validatePlan(steps, modules);

    expect(errors).toContainEqual(
      expect.objectContaining({
        type: 'dependency',
        details: ['router_admin_access'],
      }),
    );
  });

  it('marks required options as missing when blank', () => {
    const steps: PlanStepState[] = [
      {
        id: 'step-0',
        moduleName: 'auxiliary/admin/2wire/xslt_password_reset',
        options: { RHOSTS: '' },
      },
    ];

    const errors = validatePlan(steps, modules);

    expect(errors).toContainEqual(
      expect.objectContaining({
        type: 'option',
        message: expect.stringContaining('RHOSTS'),
      }),
    );
  });

  it('passes validation when dependencies and required options are satisfied', () => {
    const steps: PlanStepState[] = [
      {
        id: 'step-0',
        moduleName: 'auxiliary/admin/2wire/xslt_password_reset',
        options: { RHOSTS: '192.168.0.1', RPORT: '8080' },
      },
      {
        id: 'step-1',
        moduleName: 'auxiliary/admin/appletv/appletv_display_video',
        options: {},
      },
      {
        id: 'step-2',
        moduleName: 'auxiliary/admin/backupexec/dump',
        options: {},
      },
    ];

    const errors = validatePlan(steps, modules);

    expect(errors).toHaveLength(0);
  });
});

describe('RunPlan serialization', () => {
  it('serializes module selections and omits empty steps and options', () => {
    const steps: PlanStepState[] = [
      {
        id: 'step-0',
        moduleName: 'auxiliary/admin/2wire/xslt_password_reset',
        options: { RHOSTS: '10.0.0.5', RPORT: '' },
      },
      {
        id: 'step-1',
        moduleName: '',
        options: {},
      },
      {
        id: 'step-2',
        moduleName: 'auxiliary/admin/backupexec/dump',
        options: {},
      },
    ];

    const plan: SerializedStep[] = serializePlan(steps);

    expect(plan).toEqual([
      {
        module: 'auxiliary/admin/2wire/xslt_password_reset',
        options: { RHOSTS: '10.0.0.5' },
      },
      {
        module: 'auxiliary/admin/backupexec/dump',
        options: {},
      },
    ]);
  });
});
