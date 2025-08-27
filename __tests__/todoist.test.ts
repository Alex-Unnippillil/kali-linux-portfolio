import 'fake-indexeddb/auto';
import { addTask, getAllTasks, toggleTask, deleteTask, exportTasks, importTasks, clearTasks } from '../components/apps/todoist/db';

(globalThis as any).structuredClone = (globalThis as any).structuredClone || ((obj: any) => JSON.parse(JSON.stringify(obj)));

describe('todoist indexeddb', () => {
  beforeEach(async () => {
    await clearTasks();
  });

  test('create/toggle/delete tasks persist', async () => {
    const task = { id: 1, title: 'Test', completed: false, tags: ['a'] };
    await addTask(task);
    let tasks = await getAllTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toEqual(task);

    await toggleTask(1);
    tasks = await getAllTasks();
    expect(tasks[0].completed).toBe(true);

    await deleteTask(1);
    tasks = await getAllTasks();
    expect(tasks).toHaveLength(0);
  });

  test('import/export round-trip', async () => {
    const tasks = [
      { id: 1, title: 'A', completed: false, tags: ['x'] },
      { id: 2, title: 'B', completed: true, tags: [] },
    ];
    for (const t of tasks) await addTask(t);
    const json = await exportTasks();
    await clearTasks();
    await importTasks(json);
    const imported = await getAllTasks();
    expect(imported).toEqual(tasks);
  });
});
