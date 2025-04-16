import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../services/task.services';
import { Task } from '../../models/task';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent {
  taskService = inject(TaskService);
  tasks$ = this.taskService.tasks$;

  toggle(task: Task) {
    this.taskService.toggleTask(task.id);
  }

  remove(task: Task) {
    this.taskService.removeTask(task.id);
  }
}
