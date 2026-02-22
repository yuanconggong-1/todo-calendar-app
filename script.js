const STORAGE_KEY = "modern_todo_items_v1";

const todoForm = document.getElementById("todoForm");
const todoInput = document.getElementById("todoInput");
const todoDateInput = document.getElementById("todoDate");
const todoStartTimeInput = document.getElementById("todoStartTime");
const todoEndTimeInput = document.getElementById("todoEndTime");
const taskDetailDialog = document.getElementById("taskDetailDialog");
const taskDetailForm = document.getElementById("taskDetailForm");
const taskTitleInput = document.getElementById("taskTitleInput");
const subtaskEditorList = document.getElementById("subtaskEditorList");
const addSubtaskBtn = document.getElementById("addSubtaskBtn");
const closeTaskDialogBtn = document.getElementById("closeTaskDialogBtn");
const cancelTaskDialogBtn = document.getElementById("cancelTaskDialogBtn");
const todoList = document.getElementById("todoList");
const emptyState = document.getElementById("emptyState");
const totalCountEl = document.getElementById("totalCount");
const completedCountEl = document.getElementById("completedCount");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");
const calendarGrid = document.getElementById("calendarGrid");
const calendarMonthLabel = document.getElementById("calendarMonthLabel");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");

const today = startOfDay(new Date());
let selectedDate = formatDateKey(today);
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let todos = normalizeTodos(loadTodos());
let draftTaskDetails = { title: "", subtasks: [] };
let dialogSubtasks = [];

todoDateInput.value = selectedDate;

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeTodos(items) {
  return items.map((item) => ({
    id: item.id || fallbackId(),
    text: typeof item.text === "string" ? item.text : "",
    completed: Boolean(item.completed),
    createdAt: Number(item.createdAt) || Date.now(),
    dueDate: isValidDateKey(item.dueDate) ? item.dueDate : selectedDate,
    startTime: isValidTimeKey(item.startTime) ? item.startTime : "",
    endTime: isValidTimeKey(item.endTime) ? item.endTime : "",
    subtasks: normalizeSubtasks(item.subtasks),
  }));
}

function normalizeSubtasks(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((entry) => (typeof entry === "string" ? entry : entry && entry.text))
    .filter((text) => typeof text === "string")
    .map((text) => text.trim())
    .filter(Boolean);
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function fallbackId() {
  return String(Date.now() + Math.random());
}

function createTodo(text, dueDate, startTime, endTime, subtasks) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : fallbackId(),
    text,
    completed: false,
    createdAt: Date.now(),
    dueDate,
    startTime,
    endTime,
    subtasks: normalizeSubtasks(subtasks),
  };
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isValidDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTimeKey(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function parseDateKey(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatHumanDate(value) {
  const d = parseDateKey(value);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(d);
}

function getVisibleTodos() {
  return todos.filter((todo) => todo.dueDate === selectedDate);
}

function renderTodos() {
  todoList.innerHTML = "";
  const visibleTodos = getVisibleTodos();

  emptyState.classList.toggle("hidden", visibleTodos.length > 0);

  visibleTodos.forEach((todo) => {
    const item = document.createElement("li");
    item.className = `todo-item${todo.completed ? " completed" : ""}`;
    item.dataset.id = todo.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "todo-check";
    checkbox.checked = todo.completed;
    checkbox.setAttribute("aria-label", `Toggle task complete: ${todo.text}`);

    const textWrap = document.createElement("div");

    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = todo.text;

    const meta = document.createElement("small");
    meta.className = "todo-meta";
    meta.textContent = buildTodoMeta(todo);

    textWrap.append(text, meta);

    if (todo.subtasks.length > 0) {
      const subtaskList = document.createElement("ul");
      subtaskList.className = "subtask-list";
      todo.subtasks.forEach((subtask) => {
        const li = document.createElement("li");
        li.textContent = subtask;
        subtaskList.append(li);
      });
      textWrap.append(subtaskList);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.setAttribute("aria-label", `Delete task: ${todo.text}`);

    checkbox.addEventListener("change", () => toggleTodo(todo.id));
    deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

    item.append(checkbox, textWrap, deleteBtn);
    todoList.append(item);
  });

  updateStats();
}

function updateStats() {
  const total = todos.length;
  const completed = todos.filter((todo) => todo.completed).length;
  const selectedCompleted = getVisibleTodos().filter((todo) => todo.completed).length;

  totalCountEl.textContent = String(total);
  completedCountEl.textContent = String(completed);
  clearCompletedBtn.disabled = selectedCompleted === 0;
  clearCompletedBtn.style.opacity = selectedCompleted === 0 ? "0.5" : "1";
  clearCompletedBtn.style.cursor = selectedCompleted === 0 ? "not-allowed" : "pointer";
}

function buildTodoMeta(todo) {
  const parts = [`Date: ${formatHumanDate(todo.dueDate)}`];
  if (todo.startTime && todo.endTime) {
    parts.push(`Time: ${todo.startTime}-${todo.endTime}`);
  } else if (todo.startTime) {
    parts.push(`Start: ${todo.startTime}`);
  } else if (todo.endTime) {
    parts.push(`End: ${todo.endTime}`);
  }
  return parts.join(" | ");
}

function buildTaskPreview(details) {
  if (!details.title) return "";
  const subtaskCount = details.subtasks.length;
  return subtaskCount > 0 ? `${details.title} (${subtaskCount} steps)` : details.title;
}

function addTodo(text, dueDate, startTime, endTime, subtasks) {
  const value = text.trim();
  if (!value) return;

  todos.unshift(createTodo(value, dueDate, startTime, endTime, subtasks));
  saveTodos();
  renderCalendar();
  renderTodos();
}

function toggleTodo(id) {
  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
  saveTodos();
  renderCalendar();
  renderTodos();
}

function deleteTodo(id) {
  todos = todos.filter((todo) => todo.id !== id);
  saveTodos();
  renderCalendar();
  renderTodos();
}

function clearCompleted() {
  const before = todos.length;
  todos = todos.filter((todo) => !(todo.dueDate === selectedDate && todo.completed));
  if (todos.length === before) return;

  saveTodos();
  renderCalendar();
  renderTodos();
}

function getTaskCountForDate(dateKey) {
  return todos.reduce((count, todo) => count + (todo.dueDate === dateKey ? 1 : 0), 0);
}

function createSubtaskEditorRow(value = "") {
  const row = document.createElement("div");
  row.className = "subtask-editor-row";

  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 120;
  input.placeholder = "例如：收集资料 / 写提纲 / 检查结果";
  input.value = value;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "subtask-remove-btn";
  removeBtn.textContent = "删除";
  removeBtn.addEventListener("click", () => {
    row.remove();
    if (subtaskEditorList.children.length === 0) {
      subtaskEditorList.append(createSubtaskEditorRow(""));
    }
  });

  row.append(input, removeBtn);
  return row;
}

function renderSubtaskEditor(items) {
  subtaskEditorList.innerHTML = "";
  const values = items.length > 0 ? items : [""];
  values.forEach((value) => subtaskEditorList.append(createSubtaskEditorRow(value)));
}

function collectSubtaskEditorValues() {
  const inputs = subtaskEditorList.querySelectorAll("input");
  return normalizeSubtasks(Array.from(inputs, (input) => input.value));
}

function openTaskDetailDialog() {
  if (!taskDetailDialog) return;
  taskTitleInput.value = draftTaskDetails.title || "";
  dialogSubtasks = [...draftTaskDetails.subtasks];
  renderSubtaskEditor(dialogSubtasks);
  taskDetailDialog.showModal();
  setTimeout(() => taskTitleInput.focus(), 0);
}

function closeTaskDetailDialog() {
  if (taskDetailDialog.open) {
    taskDetailDialog.close();
  }
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  calendarMonthLabel.textContent = `${year}-${String(month + 1).padStart(2, "0")}`;

  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const gridStart = new Date(year, month, 1 - firstWeekday);
  const todayKey = formatDateKey(today);

  for (let i = 0; i < 42; i += 1) {
    const cellDate = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i
    );
    const cellKey = formatDateKey(cellDate);
    const inMonth = cellDate.getMonth() === month;
    const count = getTaskCountForDate(cellKey);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "calendar-day";
    btn.setAttribute("role", "gridcell");
    btn.setAttribute("aria-label", `${cellKey}, ${count} task(s)`);

    if (!inMonth) btn.classList.add("outside");
    if (cellKey === selectedDate) btn.classList.add("selected");
    if (cellKey === todayKey) btn.classList.add("today");

    const dayNumber = document.createElement("span");
    dayNumber.className = "day-number";
    dayNumber.textContent = String(cellDate.getDate());

    const dayCount = document.createElement("span");
    dayCount.className = "day-count";
    dayCount.textContent = count > 0 ? `${count}` : "";

    btn.append(dayNumber);
    if (count > 0) {
      const dot = document.createElement("span");
      dot.className = "day-dot";
      btn.append(dot, dayCount);
    } else {
      btn.append(dayCount);
    }

    btn.addEventListener("click", () => {
      selectedDate = cellKey;
      todoDateInput.value = selectedDate;
      visibleMonth = new Date(cellDate.getFullYear(), cellDate.getMonth(), 1);
      renderCalendar();
      renderTodos();
    });

    calendarGrid.append(btn);
  }
}

todoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const taskTitle = (draftTaskDetails.title || todoInput.value || "").trim();
  const taskSubtasks = normalizeSubtasks(draftTaskDetails.subtasks);

  if (!taskTitle) {
    openTaskDetailDialog();
    return;
  }

  const dueDate = isValidDateKey(todoDateInput.value) ? todoDateInput.value : selectedDate;
  const startTime = isValidTimeKey(todoStartTimeInput.value) ? todoStartTimeInput.value : "";
  const endTime = isValidTimeKey(todoEndTimeInput.value) ? todoEndTimeInput.value : "";

  if (startTime && endTime && endTime < startTime) {
    alert("结束时间不能早于开始时间");
    todoEndTimeInput.focus();
    return;
  }

  selectedDate = dueDate;
  const dueDateObj = parseDateKey(dueDate);
  visibleMonth = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), 1);
  addTodo(taskTitle, dueDate, startTime, endTime, taskSubtasks);
  draftTaskDetails = { title: "", subtasks: [] };
  todoInput.value = "";
  todoStartTimeInput.value = "";
  todoEndTimeInput.value = "";
  todoInput.focus();
});

todoDateInput.addEventListener("change", () => {
  if (!isValidDateKey(todoDateInput.value)) return;
  selectedDate = todoDateInput.value;
  const d = parseDateKey(selectedDate);
  visibleMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  renderCalendar();
  renderTodos();
});

prevMonthBtn.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  renderCalendar();
});

clearCompletedBtn.addEventListener("click", clearCompleted);

todoInput.addEventListener("click", openTaskDetailDialog);

todoInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openTaskDetailDialog();
  }
});

addSubtaskBtn.addEventListener("click", () => {
  const row = createSubtaskEditorRow("");
  subtaskEditorList.append(row);
  const input = row.querySelector("input");
  if (input) input.focus();
});

closeTaskDialogBtn.addEventListener("click", closeTaskDetailDialog);
cancelTaskDialogBtn.addEventListener("click", closeTaskDetailDialog);

taskDetailForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = taskTitleInput.value.trim();
  const subtasks = collectSubtaskEditorValues();

  if (!title) {
    alert("请先填写任务标题");
    taskTitleInput.focus();
    return;
  }

  draftTaskDetails = { title, subtasks };
  todoInput.value = buildTaskPreview(draftTaskDetails);
  closeTaskDetailDialog();
});

renderCalendar();
renderTodos();
