self.onmessage = (e) => {
  const { type } = e.data || {};
  if (type !== 'move') return;
  const { sections, from, to, id } = e.data;
  const newSections = sections.map((s) => ({ ...s, tasks: [...s.tasks] }));
  const fromIndex = newSections.findIndex((s) => s.title === from);
  const toIndex = newSections.findIndex((s) => s.title === to);
  if (fromIndex > -1 && toIndex > -1) {
    const tasks = newSections[fromIndex].tasks;
    const index = tasks.findIndex((t) => t.id === id);
    if (index > -1) {
      const [task] = tasks.splice(index, 1);
      newSections[toIndex].tasks.push(task);
      self.postMessage({ sections: newSections, taskTitle: task.title, to });
      return;
    }
  }
  self.postMessage({ sections });
};

