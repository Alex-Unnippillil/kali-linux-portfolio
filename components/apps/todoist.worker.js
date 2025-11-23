const cloneState = (state) => ({
  sections: (state?.sections || []).map((section) => ({
    id: section.id,
    name: section.name,
    taskIds: Array.isArray(section.taskIds) ? [...section.taskIds] : [],
  })),
  tasks: state?.tasks ? { ...state.tasks } : {},
});

const titleCase = (value) =>
  String(value)
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const insertTaskId = (taskIds, taskId, index) => {
  const next = [...taskIds];
  if (typeof index === 'number' && index >= 0 && index <= next.length) {
    next.splice(index, 0, taskId);
  } else if (!next.includes(taskId)) {
    next.push(taskId);
  }
  return next;
};

const ensureSection = (state, sectionId) => {
  const index = state.sections.findIndex((section) => section.id === sectionId);
  if (index > -1) {
    return { state, index };
  }
  const section = {
    id: sectionId,
    name: titleCase(sectionId),
    taskIds: [],
  };
  return {
    state: {
      ...state,
      sections: [...state.sections, section],
    },
    index: state.sections.length,
  };
};

const moveTask = (state, taskId, toSectionId, index) => {
  const currentTask = state.tasks?.[taskId];
  if (!currentTask) return state;
  if (currentTask.sectionId === toSectionId) {
    const next = cloneState(state);
    const sectionIndex = next.sections.findIndex(
      (section) => section.id === currentTask.sectionId,
    );
    if (sectionIndex === -1) return state;
    const section = next.sections[sectionIndex];
    const filtered = section.taskIds.filter((id) => id !== taskId);
    next.sections[sectionIndex] = {
      ...section,
      taskIds: insertTaskId(filtered, taskId, index),
    };
    next.tasks[taskId] = {
      ...next.tasks[taskId],
      updatedAt: new Date().toISOString(),
    };
    return next;
  }
  let next = cloneState(state);
  const fromIndex = next.sections.findIndex(
    (section) => section.id === currentTask.sectionId,
  );
  if (fromIndex === -1) return state;
  const ensured = ensureSection(next, toSectionId);
  next = ensured.state;
  const toIndex = ensured.index;

  next.sections = next.sections.map((section, idx) => {
    if (idx === fromIndex) {
      return {
        ...section,
        taskIds: section.taskIds.filter((id) => id !== taskId),
      };
    }
    if (idx === toIndex) {
      const filtered = section.taskIds.filter((id) => id !== taskId);
      return {
        ...section,
        taskIds: insertTaskId(filtered, taskId, index),
      };
    }
    return section;
  });

  next.tasks[taskId] = {
    ...next.tasks[taskId],
    sectionId: toSectionId,
    updatedAt: new Date().toISOString(),
  };
  return next;
};

self.onmessage = (event) => {
  const { type, payload } = event.data || {};
  if (type !== 'move-task') return;
  const { state, taskId, sectionId, index } = payload || {};
  if (!state || !taskId || !sectionId) return;
  const next = moveTask(state, taskId, sectionId, index);
  self.postMessage({ state: next, taskId, sectionId });
};

