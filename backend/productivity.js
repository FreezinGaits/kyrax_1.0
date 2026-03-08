const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const EXPENSES_FILE = path.join(DATA_DIR, 'expenses.json');
const CALENDAR_FILE = path.join(DATA_DIR, 'calendar.json');

// Helper to read/write JSON
const loadJson = (file) => {
  if (fs.existsSync(file)) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return []; }
  }
  return [];
};
const saveJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// ══════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════
function manageTasks(action, title) {
  let tasks = loadJson(TASKS_FILE);
  if (action === 'add') {
    if (!title) return "Error: Task title required.";
    tasks.push({ id: Date.now(), title, status: 'pending' });
    saveJson(TASKS_FILE, tasks);
    return `Task added: "${title}"`;
  }
  if (action === 'list') {
    if (tasks.length === 0) return "You have no tasks.";
    return "Your tasks:\n" + tasks.map((t, i) => `${i + 1}. [${t.status === 'completed' ? 'X' : ' '}] ${t.title}`).join('\n');
  }
  if (action === 'complete' || action === 'delete') {
    if (!title) return "Error: Task title or number required.";
    const query = String(title).toLowerCase();
    const index = parseInt(query) - 1;
    let found = -1;
    if (!isNaN(index) && index >= 0 && index < tasks.length) found = index;
    else found = tasks.findIndex(t => t.title.toLowerCase().includes(query));

    if (found === -1) return `Task "${title}" not found.`;
    const t = tasks[found];
    if (action === 'complete') {
      t.status = 'completed';
      saveJson(TASKS_FILE, tasks);
      return `Task marked completed: "${t.title}"`;
    } else {
      tasks.splice(found, 1);
      saveJson(TASKS_FILE, tasks);
      return `Task deleted: "${t.title}"`;
    }
  }
  return "Unknown action for tasks.";
}

// ══════════════════════════════════════════════
// NOTES
// ══════════════════════════════════════════════
function manageNotes(action, title, content) {
  let notes = loadJson(NOTES_FILE);
  if (action === 'create') {
    if (!title || !content) return "Error: Note title and content required.";
    const existing = notes.find(n => n.title.toLowerCase() === title.toLowerCase());
    if (existing) {
      existing.content += '\n' + content;
      existing.updatedAt = new Date().toISOString();
    } else {
      notes.push({ id: Date.now(), title, content, updatedAt: new Date().toISOString() });
    }
    saveJson(NOTES_FILE, notes);
    return `Note saved: "${title}"`;
  }
  if (action === 'read') {
    if (!title) { // List all
      if (notes.length === 0) return "You have no notes.";
      return "Your notes:\n" + notes.map(n => `- ${n.title}`).join('\n');
    }
    const n = notes.find(n => n.title.toLowerCase().includes(title.toLowerCase()));
    if (!n) return `Note "${title}" not found.`;
    return `Note: ${n.title}\n\n${n.content}`;
  }
  if (action === 'delete') {
    if (!title) return "Error: Note title required.";
    const idx = notes.findIndex(n => n.title.toLowerCase().includes(title.toLowerCase()));
    if (idx === -1) return `Note "${title}" not found.`;
    const deleted = notes.splice(idx, 1)[0].title;
    saveJson(NOTES_FILE, notes);
    return `Deleted note: "${deleted}"`;
  }
  return "Unknown action for notes.";
}

// ══════════════════════════════════════════════
// EXPENSES
// ══════════════════════════════════════════════
function manageExpenses(action, item, amountText) {
  let expenses = loadJson(EXPENSES_FILE);
  if (action === 'add') {
    if (!item || !amountText) return "Error: item description and amount required.";
    const amount = parseFloat(amountText.toString().replace(/[^\d.-]/g, ''));
    if (isNaN(amount)) return "Error: Invalid amount.";
    expenses.push({ id: Date.now(), item, amount, date: new Date().toISOString() });
    saveJson(EXPENSES_FILE, expenses);
    return `Logged expense: ${item} for ₹${amount}`;
  }
  if (action === 'history' || action === 'summary') {
    if (expenses.length === 0) return "No expenses logged.";
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const recent = expenses.slice(-5).map(e => `- ${e.item}: ₹${e.amount}`).join('\n');
    return `Total expenses: ₹${total}\n\nRecent:\n${recent}`;
  }
  return "Unknown action for expenses. Use 'add' or 'summary'.";
}

// ══════════════════════════════════════════════
// CALENDAR
// ══════════════════════════════════════════════
function manageCalendar(action, title, timeStr) {
  let events = loadJson(CALENDAR_FILE);
  if (action === 'add') {
    if (!title || !timeStr) return "Error: Event title and time required.";
    events.push({ id: Date.now(), title, time: timeStr, created: new Date().toISOString() });
    saveJson(CALENDAR_FILE, events);
    return `Calendar event added: "${title}" at ${timeStr}`;
  }
  if (action === 'list') {
    if (events.length === 0) return "No upcoming events.";
    return "Your events:\n" + events.map(e => `- ${e.title} at ${e.time}`).join('\n');
  }
  return "Unknown action for calendar.";
}

module.exports = {
  manageTasks,
  manageNotes,
  manageExpenses,
  manageCalendar
};
