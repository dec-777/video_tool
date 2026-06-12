import { useEffect, useState } from "react";
import { getTaskSnapshot, subscribeTasks } from "../store/taskStore.js";

export function useTasks() {
  const [tasks, setTasks] = useState(getTaskSnapshot);

  useEffect(() => subscribeTasks(setTasks), []);

  return tasks;
}
