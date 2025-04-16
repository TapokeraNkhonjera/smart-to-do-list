import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Task } from '../models/task';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private tasks = new BehaviorSubject<Task[]>([]);
  tasks$ = this.tasks.asObservable();

  private currentId = 1;

  addTask(title: string) {
    const newTask: Task = {
      id: this.currentId++,
      title,
      completed: false
    };
    this.tasks.next([...this.tasks.value, newTask]);
  }

  toggleTask(id: number) {
    const updated = this.tasks.value.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    this.tasks.next(updated);
  }

  removeTask(id: number) {
    this.tasks.next(this.tasks.value.filter(task => task.id !== id));
  }
}
