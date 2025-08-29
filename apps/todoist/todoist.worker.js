self.onmessage = (e) => {
  const { type } = e.data || {};
  if (type !== 'move') return;
  const { groups, from, to, id } = e.data;
  const newGroups = {
    ...groups,
    [from]: [...groups[from]],
    [to]: [...groups[to]],
  };
  const index = newGroups[from].findIndex((t) => t.id === id);
  if (index > -1) {
    const [task] = newGroups[from].splice(index, 1);
    newGroups[to].push(task);
    self.postMessage({ groups: newGroups, taskTitle: task.title, to });
  } else {
    self.postMessage({ groups: newGroups });
  }
};

