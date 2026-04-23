// cli.js
const fs = require('fs');
const { program } = require('commander');
const { TaskManager } = require('./app');
const { TaskStatus, TaskPriority } = require('./models');

const formatTask = (task) => {
  const statusSymbol = {
    [TaskStatus.TODO]: '[ ]',
    [TaskStatus.IN_PROGRESS]: '[>]',
    [TaskStatus.REVIEW]: '[?]',
    [TaskStatus.DONE]: '[✓]'
  };

  const prioritySymbol = {
    [TaskPriority.LOW]: '!',
    [TaskPriority.MEDIUM]: '!!',
    [TaskPriority.HIGH]: '!!!',
    [TaskPriority.URGENT]: '!!!!'
  };

  const dueStr = task.dueDate
    ? `Due: ${task.dueDate.toISOString().split('T')[0]}`
    : 'No due date';

  const tagsStr = task.tags.length
    ? `Tags: ${task.tags.join(', ')}`
    : 'No tags';

  return (
    `${statusSymbol[task.status]} ${task.id.substr(0, 8)} - ${prioritySymbol[task.priority]} ${task.title}\n` +
    `  ${task.description}\n` +
    `  ${dueStr} | ${tagsStr}\n` +
    `  Created: ${task.createdAt.toISOString().split('T')[0]} ${task.createdAt.toTimeString().split(' ')[0]}`
  );
};

// Function to escape CSV fields that contain commas or quotes
const escapeCsvField = (field) => {
  if (field === null || field === undefined) {
    return '';
  }
  const stringField = String(field);
  // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
};

// Function to convert tasks array to CSV format
const tasksToCsv = (tasks) => {
  if (tasks.length === 0) {
    return 'ID,Title,Description,Priority,Status,Due Date,Tags,Created At,Completed At\n';
  }

  // CSV Header
  const headers = ['ID', 'Title', 'Description', 'Priority', 'Status', 'Due Date', 'Tags', 'Created At', 'Completed At'];
  
  // Convert each task to a CSV row
  const rows = tasks.map(task => {
    const dueDate = task.dueDate ? task.dueDate.toISOString().split('T')[0] : '';
    const completedAt = task.completedAt ? task.completedAt.toISOString().split('T')[0] : '';
    const tagsStr = task.tags.join('; ');
    const createdAt = task.createdAt.toISOString().split('T')[0];
    
    return [
      escapeCsvField(task.id),
      escapeCsvField(task.title),
      escapeCsvField(task.description),
      escapeCsvField(task.priority),
      escapeCsvField(task.status),
      escapeCsvField(dueDate),
      escapeCsvField(tagsStr),
      escapeCsvField(createdAt),
      escapeCsvField(completedAt)
    ].join(',');
  });

  // Combine headers and rows
  return headers.join(',') + '\n' + rows.join('\n');
};

const taskManager = new TaskManager();

program
  .version('1.0.0')
  .description('Task Manager CLI');

program
  .command('create <title>')
  .description('Create a new task')
  .option('-d, --description <description>', 'Task description', '')
  .option('-p, --priority <priority>', 'Task priority (1-4)', 2)
  .option('-u, --due <due_date>', 'Due date (YYYY-MM-DD)')
  .option('-t, --tags <tags>', 'Comma-separated tags', '')
  .action((title, options) => {
    const tags = options.tags ? options.tags.split(',').map(tag => tag.trim()) : [];
    const taskId = taskManager.createTask(
      title,
      options.description,
      options.priority,
      options.due,
      tags
    );

    if (taskId) {
      console.log(`Created task with ID: ${taskId}`);
    }
  });

program
  .command('list')
  .description('List all tasks')
  .option('-s, --status <status>', 'Filter by status')
  .option('-p, --priority <priority>', 'Filter by priority')
  .option('-o, --overdue', 'Show only overdue tasks')
  .action((options) => {
    const tasks = taskManager.listTasks(options.status, options.priority, options.overdue);
    if (tasks.length > 0) {
      tasks.forEach(task => {
        console.log(formatTask(task));
        console.log('-'.repeat(50));
      });
    } else {
      console.log('No tasks found matching the criteria.');
    }
  });

program
  .command('status <task_id> <status>')
  .description('Update task status')
  .action((taskId, status) => {
    if (taskManager.updateTaskStatus(taskId, status)) {
      console.log(`Updated task status to ${status}`);
    } else {
      console.log('Failed to update task status. Task not found.');
    }
  });

program
  .command('priority <task_id> <priority>')
  .description('Update task priority')
  .action((taskId, priority) => {
    if (taskManager.updateTaskPriority(taskId, priority)) {
      console.log(`Updated task priority to ${priority}`);
    } else {
      console.log('Failed to update task priority. Task not found.');
    }
  });

program
  .command('due <task_id> <due_date>')
  .description('Update task due date')
  .action((taskId, dueDate) => {
    if (taskManager.updateTaskDueDate(taskId, dueDate)) {
      console.log(`Updated task due date to ${dueDate}`);
    } else {
      console.log('Failed to update task due date. Task not found or invalid date.');
    }
  });

program
  .command('tag <task_id> <tag>')
  .description('Add tag to task')
  .action((taskId, tag) => {
    if (taskManager.addTagToTask(taskId, tag)) {
      console.log(`Added tag '${tag}' to task`);
    } else {
      console.log('Failed to add tag. Task not found.');
    }
  });

program
  .command('untag <task_id> <tag>')
  .description('Remove tag from task')
  .action((taskId, tag) => {
    if (taskManager.removeTagFromTask(taskId, tag)) {
      console.log(`Removed tag '${tag}' from task`);
    } else {
      console.log('Failed to remove tag. Task or tag not found.');
    }
  });

program
  .command('show <task_id>')
  .description('Show task details')
  .action((taskId) => {
    const task = taskManager.getTaskDetails(taskId);
    if (task) {
      console.log(formatTask(task));
    } else {
      console.log('Task not found.');
    }
  });

program
  .command('delete <task_id>')
  .description('Delete a task')
  .action((taskId) => {
    if (taskManager.deleteTask(taskId)) {
      console.log(`Deleted task ${taskId}`);
    } else {
      console.log('Failed to delete task. Task not found.');
    }
  });

program
  .command('stats')
  .description('Show task statistics')
  .action(() => {
    const stats = taskManager.getStatistics();
    console.log(`Total tasks: ${stats.total}`);
    console.log('By status:');
    Object.entries(stats.byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    console.log('By priority:');
    Object.entries(stats.byPriority).forEach(([priority, count]) => {
      console.log(`  ${priority}: ${count}`);
    });
    console.log(`Overdue tasks: ${stats.overdue}`);
    console.log(`Completed in last 7 days: ${stats.completedLastWeek}`);
  });

program
  .command('export [filename]')
  .description('Export tasks to CSV file')
  .option('-s, --status <status>', 'Filter by status')
  .option('-p, --priority <priority>', 'Filter by priority')
  .option('-o, --overdue', 'Export only overdue tasks')
  .action((filename, options) => {
    // Use provided filename or default to tasks-export.csv
    const outputFile = filename || 'tasks-export.csv';
    
    // Get filtered tasks (same logic as list command)
    const tasks = taskManager.listTasks(options.status, options.priority, options.overdue);
    
    if (tasks.length === 0) {
      console.log('No tasks found matching the criteria. Nothing to export.');
      return;
    }
    
    try {
      // Convert tasks to CSV format
      const csvContent = tasksToCsv(tasks);
      
      // Write to file
      fs.writeFileSync(outputFile, csvContent, 'utf8');
      
      console.log(`✓ Successfully exported ${tasks.length} task(s) to ${outputFile}`);
    } catch (error) {
      console.error(`Failed to export tasks: ${error.message}`);
    }
  });

program
  .command('cleanup')
  .description('Mark old overdue tasks as abandoned (overdue >7 days, priority <3)')
  .option('-d, --dry-run', 'Preview what would be abandoned without making changes')
  .action((options) => {
    if (options.dryRun) {
      // Dry run - show what would happen without making changes
      console.log('🔍 DRY RUN MODE - Checking for tasks to abandon...\n');
      
      const oldOverdueTasks = taskManager.storage.getOverdueTasksOlderThan(7);
      const { shouldMarkAsAbandoned } = require('./task_priority');
      const tasksToAbandon = oldOverdueTasks.filter(task => shouldMarkAsAbandoned(task));
      
      if (tasksToAbandon.length === 0) {
        console.log('✓ No tasks would be abandoned.');
      } else {
        console.log(`⚠️  ${tasksToAbandon.length} task(s) would be marked as abandoned:\n`);
        tasksToAbandon.forEach(task => {
          const daysOverdue = Math.ceil((new Date() - task.dueDate) / (1000 * 60 * 60 * 24));
          console.log(`  - ${task.id.substr(0, 8)}: "${task.title}"`);
          console.log(`    Priority: ${task.priority}, Overdue: ${daysOverdue} days`);
          console.log(`    Due: ${task.dueDate.toISOString().split('T')[0]}\n`);
        });
        console.log('💡 Run "node cli.js cleanup" (without --dry-run) to apply these changes.');
      }
    } else {
      // Execute the cleanup
      const result = taskManager.markAbandonedTasks();
      
      if (result.count === 0) {
        console.log('✓ No tasks were abandoned. All tasks are current or high priority.');
      } else {
        console.log(`✓ Successfully marked ${result.count} task(s) as abandoned:\n`);
        result.tasks.forEach(task => {
          console.log(`  - ${task.id}: "${task.title}" (${task.daysOverdue} days overdue)`);
        });
      }
    }
  });

program.parse(process.argv);

// If no arguments, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}