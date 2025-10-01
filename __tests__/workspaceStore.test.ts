import {
  createWorkspaceFromTemplate,
  getPendingHistoryAction,
  getState,
  getTemplates,
  resetWorkspaceStore,
  undoHistoryAction,
} from '../utils/workspaces/store';

describe('workspace store', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetWorkspaceStore();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    resetWorkspaceStore();
  });

  it('seeds workspace with template tabs and settings', () => {
    const templates = getTemplates();
    expect(templates.length).toBeGreaterThan(0);
    const template = templates[0];

    const workspace = createWorkspaceFromTemplate(template.id, { name: `${template.name} Copy` });

    expect(workspace.templateId).toBe(template.id);
    expect(workspace.tabs).toEqual(template.workspace.tabs);
    expect(workspace.settings).toEqual(template.workspace.settings);
    expect(workspace.name).toBe(`${template.name} Copy`);

    const state = getState();
    expect(state.workspaces).toHaveLength(1);
    expect(state.workspaces[0].settings).toEqual(template.workspace.settings);
    expect(state.activeWorkspaceId).toBe(state.workspaces[0].id);
  });

  it('undo restores prior workspace state when executed before expiry', () => {
    const templates = getTemplates();
    createWorkspaceFromTemplate(templates[0].id);
    const second = createWorkspaceFromTemplate(templates[1].id);

    let state = getState();
    expect(state.workspaces).toHaveLength(2);

    const history = getPendingHistoryAction();
    expect(history).not.toBeNull();

    const undone = undoHistoryAction(history!.id);
    expect(undone).toBe(true);

    state = getState();
    expect(state.workspaces).toHaveLength(1);
    expect(state.workspaces[0].id).not.toBe(second.id);
    expect(getPendingHistoryAction()).toBeNull();
  });

  it('expires undo after 10 seconds', () => {
    const templates = getTemplates();
    createWorkspaceFromTemplate(templates[0].id);
    const history = getPendingHistoryAction();
    expect(history).not.toBeNull();

    jest.advanceTimersByTime(10_000);
    jest.runOnlyPendingTimers();

    expect(getPendingHistoryAction()).toBeNull();
    expect(undoHistoryAction(history!.id)).toBe(false);
  });
});
