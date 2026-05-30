import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { Task, Subtask } from '../models/task';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private tasks = new BehaviorSubject<Task[]>([]);
  tasks$ = this.tasks.asObservable();

  private selectedCategory = new BehaviorSubject<string>('All');
  selectedCategory$ = this.selectedCategory.asObservable();

  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.loadFromStorage();
  }

  // Load from local storage or set up standard mock data
  private loadFromStorage() {
    if (!this.isBrowser) return;
    const stored = localStorage.getItem('ndondomeko_tasks');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.tasks.next(parsed);
        return;
      } catch (e) {
        console.error('Error parsing tasks from local storage', e);
      }
    }
    
    // Default rich Malawian-themed mockup tasks
    const today = this.formatDate(new Date());
    const tomorrow = this.formatDate(new Date(Date.now() + 86400000));
    
    const mockTasks: Task[] = [
      {
        id: 1,
        title: 'Review Ndondomeko design system and layout',
        completed: false,
        dueDate: today,
        dueTime: '10:00',
        priority: 'high',
        category: 'Work',
        notes: 'Take inspiration from Notion aesthetics but utilize our customized Navy, Blue, and Orange palette.',
        subtasks: [
          { id: 11, title: 'Verify custom typography (Inter font)', completed: true },
          { id: 12, title: 'Set up CSS variables for design tokens', completed: false },
          { id: 13, title: 'Refine responsive layouts for Bento dashboard', completed: false }
        ]
      },
      {
        id: 2,
        title: 'Submit Chikonzero project proposal to the supervisor',
        completed: false,
        dueDate: tomorrow,
        dueTime: '16:30',
        priority: 'high',
        category: 'Studies',
        notes: 'Include AI-assisted calendar scheduler roadmap and NLP parser architecture.',
        subtasks: [
          { id: 21, title: 'Draft system block diagrams', completed: false },
          { id: 22, title: 'Cite Malawian naming references', completed: true }
        ]
      },
      {
        id: 3,
        title: 'Call team to discuss Malawi AI community initiatives',
        completed: true,
        dueDate: today,
        dueTime: '14:00',
        priority: 'medium',
        category: 'Work',
        notes: 'Share the vision of utilizing local names and language processing models in domestic apps.'
      },
      {
        id: 4,
        title: 'Organize grocery list for weekly meal prep',
        completed: false,
        priority: 'low',
        category: 'Personal'
      }
    ];
    this.tasks.next(mockTasks);
    this.saveToStorage(mockTasks);
  }

  private saveToStorage(tasksList: Task[]) {
    if (!this.isBrowser) return;
    localStorage.setItem('ndondomeko_tasks', JSON.stringify(tasksList));
  }

  // Parse NLP strings to extract: date, time, priority, and clean title
  parseSmartTask(input: string): Omit<Task, 'id' | 'completed'> {
    let text = input.trim();
    let dueDate: string | undefined;
    let dueTime: string | undefined;
    let priority: 'low' | 'medium' | 'high' = 'medium';
    let category = this.selectedCategory.value !== 'All' ? this.selectedCategory.value : 'Inbox';

    // 1. Priority Parser
    const urgentRegex = /\b(urgent|asap|high priority|!!!)\b/i;
    const lowRegex = /\b(low priority|minor|chill)\b/i;
    if (urgentRegex.test(text)) {
      priority = 'high';
      text = text.replace(urgentRegex, '');
    } else if (lowRegex.test(text)) {
      priority = 'low';
      text = text.replace(lowRegex, '');
    }

    // 2. Date Parser
    const today = new Date();
    const todayRegex = /\b(today)\b/i;
    const tomorrowRegex = /\b(tomorrow)\b/i;
    
    // Weekdays matching
    const dayRegex = /\b(on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;

    if (todayRegex.test(text)) {
      dueDate = this.formatDate(today);
      text = text.replace(todayRegex, '');
    } else if (tomorrowRegex.test(text)) {
      const tomDate = new Date(today.getTime() + 86400000);
      dueDate = this.formatDate(tomDate);
      text = text.replace(tomorrowRegex, '');
    } else {
      const match = text.match(dayRegex);
      if (match) {
        const matchedDay = match[2].toLowerCase();
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDayIndex = daysOfWeek.indexOf(matchedDay);
        const currentDayIndex = today.getDay();
        let daysToAdd = targetDayIndex - currentDayIndex;
        if (daysToAdd <= 0) {
          daysToAdd += 7; // Next week's occurrence
        }
        const targetDate = new Date(today.getTime() + daysToAdd * 86400000);
        dueDate = this.formatDate(targetDate);
        text = text.replace(match[0], '');
      }
    }

    // 3. Time Parser: "at 4pm", "at 10:30am", "at 14:00"
    const timeRegex = /\bat\s+(\d{1,2})(:(\d{2}))?\s*(am|pm)?\b/i;
    const timeMatch = text.match(timeRegex);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[3] ? timeMatch[3] : '00';
      const ampm = timeMatch[4] ? timeMatch[4].toLowerCase() : null;

      if (ampm) {
        if (ampm === 'pm' && hours < 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;
      }
      
      const padHours = hours.toString().padStart(2, '0');
      dueTime = `${padHours}:${minutes}`;
      text = text.replace(timeMatch[0], '');
    }

    // 4. Category Parsing (e.g. "#work", "#personal")
    const hashCatRegex = /#(\w+)\b/;
    const catMatch = text.match(hashCatRegex);
    if (catMatch) {
      const foundCat = catMatch[1];
      // Map common categories cleanly
      if (['work', 'personal', 'studies', 'inbox'].includes(foundCat.toLowerCase())) {
        category = foundCat.charAt(0).toUpperCase() + foundCat.slice(1).toLowerCase();
      } else {
        category = foundCat; // custom tag
      }
      text = text.replace(hashCatRegex, '');
    }

    // Clean up double spaces or floating prepositions
    text = text.replace(/\s+/g, ' ').replace(/\s+on\s*$/i, '').replace(/\s+at\s*$/i, '').trim();

    return {
      title: text || 'Untitled Smart Task',
      dueDate,
      dueTime,
      priority,
      category,
      subtasks: [],
      notes: `Smart-parsed: Date: ${dueDate || 'Not set'}, Time: ${dueTime || 'Not set'}, Priority: ${priority}`
    };
  }

  addTask(smartTitle: string) {
    const parsedData = this.parseSmartTask(smartTitle);
    const newId = this.tasks.value.length > 0 ? Math.max(...this.tasks.value.map(t => t.id)) + 1 : 1;
    
    const newTask: Task = {
      id: newId,
      completed: false,
      ...parsedData
    };

    const updated = [newTask, ...this.tasks.value];
    this.tasks.next(updated);
    this.saveToStorage(updated);
  }

  addTaskManually(task: Omit<Task, 'id' | 'completed'>) {
    const newId = this.tasks.value.length > 0 ? Math.max(...this.tasks.value.map(t => t.id)) + 1 : 1;
    const newTask: Task = {
      id: newId,
      completed: false,
      ...task
    };

    const updated = [newTask, ...this.tasks.value];
    this.tasks.next(updated);
    this.saveToStorage(updated);
  }

  toggleTask(id: number) {
    const updated = this.tasks.value.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    this.tasks.next(updated);
    this.saveToStorage(updated);
  }

  removeTask(id: number) {
    const updated = this.tasks.value.filter(task => task.id !== id);
    this.tasks.next(updated);
    this.saveToStorage(updated);
  }

  updateTask(updatedTask: Task) {
    const updated = this.tasks.value.map(task =>
      task.id === updatedTask.id ? updatedTask : task
    );
    this.tasks.next(updated);
    this.saveToStorage(updated);
  }

  setCategory(category: string) {
    this.selectedCategory.next(category);
  }

  // Manage Subtasks
  addSubtask(taskId: number, title: string) {
    const updated = this.tasks.value.map(task => {
      if (task.id === taskId) {
        const subtasks = task.subtasks || [];
        const newSubId = subtasks.length > 0 ? Math.max(...subtasks.map(s => s.id)) + 1 : 1;
        const newSub: Subtask = { id: newSubId, title, completed: false };
        return { ...task, subtasks: [...subtasks, newSub] };
      }
      return task;
    });
    this.tasks.next(updated);
    this.saveToStorage(updated);
  }

  toggleSubtask(taskId: number, subtaskId: number) {
    const updated = this.tasks.value.map(task => {
      if (task.id === taskId && task.subtasks) {
        const subtasks = task.subtasks.map(sub =>
          sub.id === subtaskId ? { ...sub, completed: !sub.completed } : sub
        );
        return { ...task, subtasks };
      }
      return task;
    });
    this.tasks.next(updated);
    this.saveToStorage(updated);
  }

  // Helper date formatter: YYYY-MM-DD
  private formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}

