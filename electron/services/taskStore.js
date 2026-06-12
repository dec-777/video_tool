const tasks = new Map();

function addTask(task) {
  tasks.set(task.id, task);
  return task;
}

function getTask(taskId) {
  return tasks.get(taskId) || null;
}

function getTasks() {
  return Array.from(tasks.values()).sort((a, b) => a.createdAt - b.createdAt);
}

function updateTask(taskId, patch) {
  const current = getTask(taskId);
  if (!current) {
    return null;
  }

  const updated = {
    ...current,
    ...patch
  };

  tasks.set(taskId, updated);
  return updated;
}

module.exports = {
  addTask,
  getTask,
  getTasks,
  updateTask
};
