let tasks = [];
const listeners = new Set();

export function getTaskSnapshot() {
  return tasks;
}

export function setTasks(nextTasks) {
  tasks = Array.isArray(nextTasks) ? sortTasks(nextTasks) : [];
  notify();
}

export function upsertTask(task) {
  if (!task?.id) {
    return;
  }

  const index = tasks.findIndex((item) => item.id === task.id);
  if (index >= 0) {
    tasks = tasks.map((item) => (item.id === task.id ? { ...item, ...task } : item));
  } else {
    tasks = [...tasks, task];
  }

  tasks = sortTasks(tasks);
  notify();
}

export function subscribeTasks(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) {
    listener(tasks);
  }
}

function sortTasks(nextTasks) {
  return [...nextTasks].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}
