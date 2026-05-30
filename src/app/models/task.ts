export interface Subtask {
  id: number;
  title: string;
  completed: boolean;
}

export interface Task {
  id: number;
  title: string;
  completed: boolean;
  dueDate?: string;     // format: YYYY-MM-DD
  dueTime?: string;     // format: HH:MM
  priority?: 'low' | 'medium' | 'high';
  category?: string;    // e.g., 'Work', 'Personal', 'Studies', 'Inbox'
  subtasks?: Subtask[];
  notes?: string;
  aiGenerated?: boolean;
}

  