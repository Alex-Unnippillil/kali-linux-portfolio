import {
  addSection,
  createEmptyState,
  createTask,
  deleteTask,
  moveTask,
  toggleTaskCompletion,
  updateTask,
} from '../apps/todoist/utils/taskStore';

describe('todoist task store', () => {
  it('creates tasks inside an existing section', () => {
    const initial = createEmptyState();
    const next = createTask(initial, {
      id: 'task-1',
      title: 'Write changelog',
      dueDate: '2024-05-01',
      sectionId: 'today',
    });

    expect(next.tasks['task-1']).toMatchObject({
      id: 'task-1',
      title: 'Write changelog',
      dueDate: '2024-05-01',
      sectionId: 'today',
      completed: false,
    });

    const today = next.sections.find((section) => section.id === 'today');
    expect(today?.taskIds).toEqual(['task-1']);
  });

  it('creates new sections when quick add references one', () => {
    const initial = createEmptyState();
    const next = createTask(initial, {
      id: 'task-2',
      title: 'Plan roadmap',
      sectionName: 'Product Backlog',
    });

    const section = next.sections.find((item) => item.id === 'product-backlog');
    expect(section).toBeDefined();
    expect(section?.taskIds).toEqual(['task-2']);
    expect(next.tasks['task-2'].sectionId).toBe('product-backlog');
  });

  it('updates task title, completion, and due date', () => {
    const initial = createTask(createEmptyState(), {
      id: 'task-3',
      title: 'Draft release notes',
      sectionId: 'today',
    });

    const updated = updateTask(initial, 'task-3', {
      title: 'Draft 1.0 release notes',
      dueDate: '2024-06-01',
    });
    const toggled = toggleTaskCompletion(updated, 'task-3');

    expect(toggled.tasks['task-3']).toMatchObject({
      title: 'Draft 1.0 release notes',
      dueDate: '2024-06-01',
      completed: true,
    });
  });

  it('reorders tasks inside a section', () => {
    let state = createEmptyState();
    state = createTask(state, { id: 'task-4', title: 'First', sectionId: 'today' });
    state = createTask(state, { id: 'task-5', title: 'Second', sectionId: 'today' });
    state = moveTask(state, 'task-4', 'today', 1);

    const today = state.sections.find((section) => section.id === 'today');
    expect(today?.taskIds).toEqual(['task-5', 'task-4']);
  });

  it('moves tasks across sections and cleans up ordering', () => {
    let state = createEmptyState();
    state = createTask(state, { id: 'task-6', title: 'Inbox item', sectionId: 'today' });
    state = addSection(state, { id: 'inbox', name: 'Inbox' });
    const moved = moveTask(state, 'task-6', 'inbox');

    const today = moved.sections.find((section) => section.id === 'today');
    const inbox = moved.sections.find((section) => section.id === 'inbox');

    expect(today?.taskIds).toEqual([]);
    expect(inbox?.taskIds).toEqual(['task-6']);
    expect(moved.tasks['task-6'].sectionId).toBe('inbox');
  });

  it('deletes tasks from both storage and section ordering', () => {
    let state = createEmptyState();
    state = createTask(state, { id: 'task-7', title: 'Archive logs', sectionId: 'today' });
    const cleaned = deleteTask(state, 'task-7');

    expect(cleaned.tasks['task-7']).toBeUndefined();
    const today = cleaned.sections.find((section) => section.id === 'today');
    expect(today?.taskIds).toEqual([]);
  });
});
