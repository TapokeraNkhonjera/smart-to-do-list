import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.services';
import { Task, Subtask } from '../../models/task';
import { map, combineLatest } from 'rxjs';

export interface ZidutswaBlock {
  id: string;
  type: 'text' | 'heading-1' | 'heading-2' | 'bullet' | 'calendar-embed' | 'graph-embed';
  content: string;
  bold?: boolean;
  italic?: boolean;
  color?: string;
  background?: string;
  fontFamily?: 'sans' | 'serif' | 'mono';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  taskService = inject(TaskService);
  
  // UI Custom modular views state
  activeView: 'dashboard' | 'notepad' = 'dashboard';
  selectedBlock: ZidutswaBlock | null = null;
  notepadPageTitle = '📓 Malawi Smart Planner Roadmap';
  
  notepadBlocks: ZidutswaBlock[] = [
    {
      id: 'block-1',
      type: 'heading-1',
      content: 'Chikonzero Strategy & AI Outline'
    },
    {
      id: 'block-2',
      type: 'text',
      content: 'This notepad represents a modular Zidutswa document block layout. You can structure paragraphs, toggle styling attributes, translate phrases into Chichewa, or embed dynamic visual modules.',
      fontFamily: 'serif',
      bold: false,
      italic: false
    },
    {
      id: 'block-3',
      type: 'text',
      content: '💡 Malingaliro abwino amayambira pano (Great ideas begin here).',
      italic: true,
      color: '#E95623',
      background: 'rgba(233, 86, 35, 0.05)'
    },
    {
      id: 'block-4',
      type: 'calendar-embed',
      content: 'timeline'
    },
    {
      id: 'block-5',
      type: 'graph-embed',
      content: 'analytics'
    },
    {
      id: 'block-6',
      type: 'text',
      content: 'Review the live SVG-rendered task completion chart and timeline calendar widget embedded inline. They automatically pull data from the Ndondomeko core engine!',
      fontFamily: 'mono'
    }
  ];

  // Search & Filter State
  searchText = '';
  selectedCategory$ = this.taskService.selectedCategory$;
  
  // Smart Input Live Feedback
  smartInputText = '';
  parsedLivePreview: Omit<Task, 'id' | 'completed'> | null = null;
  
  // Selected task for the AI Brain Panel
  selectedTaskForAi: Task | null = null;
  aiLoading = false;
  aiSuggestedSubtasks: string[] = [];
  
  // AI Daily Summary Mode
  aiSummaryText = '';
  aiSummaryLoading = false;
  
  // Calendar timeline times
  timelineHours = [
    { label: '09:00', hour: 9 },
    { label: '10:00', hour: 10 },
    { label: '11:00', hour: 11 },
    { label: '12:00', hour: 12 },
    { label: '13:00', hour: 13 },
    { label: '14:00', hour: 14 },
    { label: '15:00', hour: 15 },
    { label: '16:00', hour: 16 },
    { label: '17:00', hour: 17 },
    { label: '18:00', hour: 18 }
  ];

  // List of active categories
  categoriesList = ['All', 'Inbox', 'Work', 'Studies', 'Personal'];

  // Current Date Label (Chichewa & English)
  currentDayLabel = '';
  currentChichewaGreeting = '';
  todayStr = '';

  constructor() {
    this.todayStr = this.formatDate(new Date());
    this.initGreeting();
  }

  // Filter tasks based on search text and active category selector
  filteredTasks$ = combineLatest([
    this.taskService.tasks$,
    this.selectedCategory$,
  ]).pipe(
    map(([tasks, category]) => {
      // 1. Filter by category
      let result = tasks;
      if (category !== 'All') {
        result = tasks.filter(t => t.category === category);
      }
      
      // 2. Filter by search text
      if (this.searchText.trim()) {
        const query = this.searchText.toLowerCase();
        result = result.filter(t => 
          t.title.toLowerCase().includes(query) || 
          (t.notes && t.notes.toLowerCase().includes(query))
        );
      }
      return result;
    })
  );

  // Timeline Tasks for Today
  timelineTasks$ = this.taskService.tasks$.pipe(
    map(tasks => {
      const todayStr = this.formatDate(new Date());
      // Return only uncompleted or recently completed tasks scheduled for today with a valid time
      return tasks.filter(t => t.dueDate === todayStr && t.dueTime);
    })
  );

  // Calculate task statistics
  stats$ = this.taskService.tasks$.pipe(
    map(tasks => {
      const total = tasks.length;
      const completed = tasks.filter(t => t.completed).length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { total, completed, percent };
    })
  );

  private initGreeting() {
    const hours = new Date().getHours();
    if (hours < 12) {
      this.currentChichewaGreeting = 'Mwauka bwanji'; // Good morning
    } else if (hours < 17) {
      this.currentChichewaGreeting = 'Mwaswera bwanji'; // Good afternoon
    } else {
      this.currentChichewaGreeting = 'Odini / Muli bwanji'; // Good evening
    }

    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
    this.currentDayLabel = new Date().toLocaleDateString('en-US', options);
  }

  // Handle smart typing parser preview
  onSmartInputChange() {
    if (this.smartInputText.trim().length > 3) {
      this.parsedLivePreview = this.taskService.parseSmartTask(this.smartInputText);
    } else {
      this.parsedLivePreview = null;
    }
  }

  // Quick action: add task via smart NLP box
  addSmartTask() {
    if (this.smartInputText.trim()) {
      this.taskService.addTask(this.smartInputText);
      this.smartInputText = '';
      this.parsedLivePreview = null;
      
      // Select the first task (the newly created one) for AI inspection
      setTimeout(() => {
        this.taskService.tasks$.subscribe(tasks => {
          if (tasks.length > 0) {
            this.selectTaskForAi(tasks[0]);
          }
        }).unsubscribe();
      }, 50);
    }
  }

  // Standard interactions
  selectCategory(cat: string) {
    this.taskService.setCategory(cat);
  }

  toggleTask(task: Task) {
    this.taskService.toggleTask(task.id);
    if (this.selectedTaskForAi && this.selectedTaskForAi.id === task.id) {
      this.selectedTaskForAi.completed = !this.selectedTaskForAi.completed;
    }
  }

  deleteTask(id: number) {
    this.taskService.removeTask(id);
    if (this.selectedTaskForAi && this.selectedTaskForAi.id === id) {
      this.selectedTaskForAi = null;
      this.aiSuggestedSubtasks = [];
    }
  }

  selectTaskForAi(task: Task) {
    this.selectedTaskForAi = task;
    this.aiSuggestedSubtasks = [];
  }

  // Subtask additions within details card
  newSubtaskTitle = '';
  addNewSubtask() {
    if (this.selectedTaskForAi && this.newSubtaskTitle.trim()) {
      this.taskService.addSubtask(this.selectedTaskForAi.id, this.newSubtaskTitle);
      this.newSubtaskTitle = '';
      // Refresh active selected model reference
      this.taskService.tasks$.subscribe(tasks => {
        const found = tasks.find(t => t.id === this.selectedTaskForAi!.id);
        if (found) this.selectedTaskForAi = found;
      }).unsubscribe();
    }
  }

  toggleSubtask(sub: Subtask) {
    if (this.selectedTaskForAi) {
      this.taskService.toggleSubtask(this.selectedTaskForAi.id, sub.id);
      sub.completed = !sub.completed;
    }
  }

  // ============================================
  // AI SIMULATION WORKFLOWS (WOW factor features)
  // ============================================

  // Trigger AI Daily Planner Briefing
  generateDailySummary() {
    this.aiSummaryLoading = true;
    this.aiSummaryText = '';
    
    setTimeout(() => {
      this.taskService.tasks$.subscribe(tasks => {
        const pending = tasks.filter(t => !t.completed);
        const urgent = pending.filter(t => t.priority === 'high');
        
        if (pending.length === 0) {
          this.aiSummaryText = `Zikomo! You have completed all your tasks for today. Enjoy a well-deserved rest, or add some new initiatives to get ahead.`;
        } else {
          this.aiSummaryText = `Based on your schedule today, you have ${pending.length} pending items. Your top priority is "${urgent.length > 0 ? urgent[0].title : pending[0].title}". I suggest focusing on it immediately during your 10:00 AM slot. Tiyeni tiyambe! (Let's start!)`;
        }
        this.aiSummaryLoading = false;
      }).unsubscribe();
    }, 1200);
  }

  // Trigger task decomposer
  decomposeTask() {
    if (!this.selectedTaskForAi) return;
    this.aiLoading = true;
    
    const title = this.selectedTaskForAi.title.toLowerCase();
    
    setTimeout(() => {
      // Intelligently suggest subtasks based on keywords in title
      if (title.includes('design') || title.includes('layout') || title.includes('ui') || title.includes('ux')) {
        this.aiSuggestedSubtasks = [
          'Audit similar layouts on Dribbble & Notion',
          'Create high-contrast Figma wireframes matching the navy-orange palette',
          'Refine typographic scales using Inter and Outfit fonts',
          'Implement subtle hover transition animations in CSS'
        ];
      } else if (title.includes('proposal') || title.includes('paper') || title.includes('submit')) {
        this.aiSuggestedSubtasks = [
          'Review project requirements and submission criteria',
          'Compile system block diagrams and database schema',
          'Draft executive summary highlighting the Malawian language aspect',
          'Proofread and export clean PDF for the advisor'
        ];
      } else if (title.includes('call') || title.includes('meet') || title.includes('discuss')) {
        this.aiSuggestedSubtasks = [
          'Draft meeting agenda and primary goals',
          'Send calendar invites with meet link',
          'Prepare slide deck outlining key statistics',
          'Set reminder for 10 minutes prior'
        ];
      } else if (title.includes('grocery') || title.includes('food') || title.includes('prep')) {
        this.aiSuggestedSubtasks = [
          'Check refrigerator inventory for essentials',
          'List items by section (Produce, Dairy, Pantry)',
          'Set maximum budget threshold',
          'Locate closest grocery store discounts'
        ];
      } else {
        // Fallback generic decomposer
        this.aiSuggestedSubtasks = [
          'Conduct initial research and gather background data',
          'Outline execution phases and set intermediate deadlines',
          'Implement core components and configurations',
          'Conduct final sanity checks and dry run'
        ];
      }
      this.aiLoading = false;
    }, 1000);
  }

  // Accept suggested subtasks and append to task
  acceptSubtasks() {
    if (!this.selectedTaskForAi || this.aiSuggestedSubtasks.length === 0) return;
    
    this.aiSuggestedSubtasks.forEach(title => {
      this.taskService.addSubtask(this.selectedTaskForAi!.id, title);
    });

    this.aiSuggestedSubtasks = [];
    
    // Refresh active model reference
    this.taskService.tasks$.subscribe(tasks => {
      const found = tasks.find(t => t.id === this.selectedTaskForAi!.id);
      if (found) this.selectedTaskForAi = found;
    }).unsubscribe();
  }

  // Parse time integer for timeline position
  getTimelineTaskTop(timeStr: string): string {
    const [hStr, mStr] = timeStr.split(':');
    const hour = parseInt(hStr, 10);
    const minutes = parseInt(mStr, 10);
    
    // Map hour 9 to 0px, hour 18 to 900px, 1 hour = 80px height
    const baseHour = 9;
    const diffHours = hour - baseHour;
    const top = (diffHours * 80) + ((minutes / 60) * 80);
    return `${top}px`;
  }

  // Format date helper: YYYY-MM-DD
  formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // ============================================
  // ZIDUTSWA MODULAR BLOCK EDITOR METHODS
  // ============================================

  toggleView(view: 'dashboard' | 'notepad') {
    this.activeView = view;
  }

  selectBlock(block: ZidutswaBlock) {
    this.selectedBlock = block;
  }

  updateBlockContent(blockId: string, event: any) {
    const text = event.target.innerText;
    const block = this.notepadBlocks.find(b => b.id === blockId);
    if (block) {
      block.content = text;
    }
  }

  addBlock(type: ZidutswaBlock['type']) {
    const newId = 'block-' + (this.notepadBlocks.length + 1);
    let content = 'New text block...';
    if (type === 'heading-1') content = 'New Header...';
    if (type === 'bullet') content = 'New list item...';
    if (type === 'calendar-embed') content = 'timeline';
    if (type === 'graph-embed') content = 'analytics';

    const newBlock: ZidutswaBlock = {
      id: newId,
      type,
      content
    };
    
    if (this.selectedBlock) {
      const idx = this.notepadBlocks.findIndex(b => b.id === this.selectedBlock!.id);
      if (idx !== -1) {
        this.notepadBlocks.splice(idx + 1, 0, newBlock);
      } else {
        this.notepadBlocks.push(newBlock);
      }
    } else {
      this.notepadBlocks.push(newBlock);
    }
    this.selectedBlock = newBlock;
  }

  deleteBlock(blockId: string) {
    this.notepadBlocks = this.notepadBlocks.filter(b => b.id !== blockId);
    if (this.selectedBlock && this.selectedBlock.id === blockId) {
      this.selectedBlock = null;
    }
  }

  formatActiveBlock(style: string) {
    if (!this.selectedBlock) return;
    
    switch(style) {
      case 'bold':
        this.selectedBlock.bold = !this.selectedBlock.bold;
        break;
      case 'italic':
        this.selectedBlock.italic = !this.selectedBlock.italic;
        break;
      case 'sans':
      case 'serif':
      case 'mono':
        this.selectedBlock.fontFamily = style as 'sans' | 'serif' | 'mono';
        break;
      case 'color-navy':
        this.selectedBlock.color = '#0D1846';
        break;
      case 'color-orange':
        this.selectedBlock.color = '#E95623';
        break;
      case 'color-blue':
        this.selectedBlock.color = '#406EB7';
        break;
      case 'color-clear':
        this.selectedBlock.color = undefined;
        break;
      case 'bg-orange':
        this.selectedBlock.background = 'rgba(233, 86, 35, 0.05)';
        break;
      case 'bg-clear':
        this.selectedBlock.background = undefined;
        break;
    }
  }

  runBlockAiTranslate(block: ZidutswaBlock) {
    const text = block.content.trim();
    if (!text) return;
    
    // AI Mock translator list mapping typical texts
    if (text.includes('Chikonzero Strategy & AI Outline')) {
      block.content = 'Ndondomeko ya Chikonzero & Chithunzi cha AI';
    } else if (text.includes('modular Zidutswa document')) {
      block.content = 'Notipadi iyi ikuyimira chithunzi cha Zidutswa. Mutha kupanga ndime, kusintha mawonekedwe amalemba, kumasulira ziganizo mu Chichewa, kapena kuyika ma module owoneka bwino.';
    } else if (text.includes('Review the live SVG-rendered task completion')) {
      block.content = 'Onani tchati chopangidwa ndi SVG ndi wigi ya kalendala yomwe yayikidwa apa. Amakoka zambiri kuchokera ku Ndondomeko!';
    } else {
      block.content = `${text} (Kumasulira mu Chichewa...)`;
    }
  }

  runBlockAiRephrase(block: ZidutswaBlock) {
    const text = block.content.trim();
    if (!text) return;
    
    block.content = `Using dynamic, block-based modular schemas: ${text}. Furthermore, this ensures streamlined scheduling synchronization across the core application timeline layers.`;
  }
}

