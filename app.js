

/**
 * ============================================================================
 * TaskFlow — Modern SaaS Task Management Application
 * ============================================================================
 * An educational, clean vanilla JavaScript application demonstrating:
 * 1. State Management
 * 2. LocalStorage Persistence
 * 3. DOM Manipulation & Event Delegation
 * 4. Filtering, Sorting, and Search Logic
 * 5. Light / Dark Theme Switching
 * ============================================================================
 */

// ============================================================================
// 1. Initial Seed Data (Used on first launch if LocalStorage is empty)
// ============================================================================
const DEFAULT_TASKS = [
  {
    id: "task-1",
    title: "Review Q4 product roadmap & sprint backlog",
    description: "Align with design and engineering leads on key release milestones.",
    priority: "high",
    dueDate: getFormattedDateOffset(1), // Tomorrow
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "task-2",
    title: "Design user onboarding flow wireframes",
    description: "Draft high-fidelity mockups in Figma for new user signup experience.",
    priority: "medium",
    dueDate: getFormattedDateOffset(3), // 3 days from now
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "task-3",
    title: "Conduct accessibility (a11y) audit for dashboard",
    description: "Check WCAG 2.1 AA color contrast and full keyboard navigation support.",
    priority: "high",
    dueDate: getFormattedDateOffset(0), // Today
    completed: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "task-4",
    title: "Update API documentation and integration endpoints",
    description: "Ensure Swagger docs accurately reflect all newly added webhook payloads.",
    priority: "low",
    dueDate: getFormattedDateOffset(5), // 5 days from now
    completed: false,
    createdAt: new Date().toISOString()
  }
];

// Helper to get a date string (YYYY-MM-DD) offset by N days
function getFormattedDateOffset(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ============================================================================
// 2. Application State
// ============================================================================
const state = {
  tasks: [],
  currentFilter: "all",      // 'all' | 'active' | 'completed'
  priorityFilter: "all",     // 'all' | 'high' | 'medium' | 'low'
  searchQuery: "",
  sortBy: "dueDateAsc",      // 'dueDateAsc' | 'dueDateDesc' | 'priority' | 'newest'
  theme: "dark",             // 'light' | 'dark'
  taskPendingDeletion: null  // Holds task ID during confirmation dialog
};

// ============================================================================
// 3. Storage Helpers (LocalStorage)
// ============================================================================
const STORAGE_KEYS = {
  TASKS: "taskflow_tasks",
  THEME: "taskflow_theme"
};

/**
 * Loads tasks from LocalStorage or returns the default seed tasks.
 */
function loadTasksFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!raw) {
      saveTasksToStorage(DEFAULT_TASKS);
      return [...DEFAULT_TASKS];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...DEFAULT_TASKS];
  } catch (error) {
    console.error("Failed to load tasks from localStorage:", error);
    return [...DEFAULT_TASKS];
  }
}

/**
 * Saves tasks to LocalStorage.
 */
function saveTasksToStorage(tasks) {
  try {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (error) {
    console.error("Failed to save tasks to localStorage:", error);
  }
}

/**
 * Loads theme preference from LocalStorage or system preference.
 */
function loadThemeFromStorage() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }
  // Optional fallback: check system dark mode preference
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark"; // Default to sleek dark mode
}

/**
 * Saves theme preference to LocalStorage.
 */
function saveThemeToStorage(theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (error) {
    console.error("Failed to save theme to localStorage:", error);
  }
}

// ============================================================================
// 4. DOM Elements Cache
// ============================================================================
const elements = {
  // Theme & Layout
  html: document.documentElement,
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  themeToggleText: document.getElementById("themeToggleText"),
  sidebar: document.getElementById("sidebar"),
  sidebarBackdrop: document.getElementById("sidebarBackdrop"),
  mobileMenuBtn: document.getElementById("mobileMenuBtn"),
  sidebarCloseBtn: document.getElementById("sidebarCloseBtn"),
  dateText: document.getElementById("dateText"),

  // Stats
  statTotalCount: document.getElementById("statTotalCount"),
  statActiveCount: document.getElementById("statActiveCount"),
  statCompletedCount: document.getElementById("statCompletedCount"),
  statHighPriorityCount: document.getElementById("statHighPriorityCount"),
  progressBar: document.getElementById("progressBar"),
  completionRateText: document.getElementById("completionRateText"),

  // Sidebar Counts
  sidebarCountAll: document.getElementById("sidebarCountAll"),
  sidebarCountActive: document.getElementById("sidebarCountActive"),
  sidebarCountCompleted: document.getElementById("sidebarCountCompleted"),
  sidebarCountHigh: document.getElementById("sidebarCountHigh"),
  sidebarCountMedium: document.getElementById("sidebarCountMedium"),
  sidebarCountLow: document.getElementById("sidebarCountLow"),

  // Main Filter Tabs & Badges
  filterTabAll: document.getElementById("filterTabAll"),
  filterTabActive: document.getElementById("filterTabActive"),
  filterTabCompleted: document.getElementById("filterTabCompleted"),
  tabCountAll: document.getElementById("tabCountAll"),
  tabCountActive: document.getElementById("tabCountActive"),
  tabCountCompleted: document.getElementById("tabCountCompleted"),

  // Search & Controls
  taskSearchInput: document.getElementById("taskSearchInput"),
  clearSearchBtn: document.getElementById("clearSearchBtn"),
  priorityFilterSelect: document.getElementById("priorityFilterSelect"),
  sortSelect: document.getElementById("sortSelect"),
  activeFilterBanner: document.getElementById("activeFilterBanner"),
  activeFilterText: document.getElementById("activeFilterText"),
  clearFilterBtn: document.getElementById("clearFilterBtn"),

  // Task List & Empty State
  taskList: document.getElementById("taskList"),
  emptyState: document.getElementById("emptyState"),
  emptyStateTitle: document.getElementById("emptyStateTitle"),
  emptyStateText: document.getElementById("emptyStateText"),
  emptyAddTaskBtn: document.getElementById("emptyAddTaskBtn"),

  // Add Task Modal
  taskModal: document.getElementById("taskModal"),
  openAddTaskBtn: document.getElementById("openAddTaskBtn"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  cancelModalBtn: document.getElementById("cancelModalBtn"),
  taskForm: document.getElementById("taskForm"),
  taskTitleInput: document.getElementById("taskTitleInput"),
  taskDescInput: document.getElementById("taskDescInput"),
  taskDueDateInput: document.getElementById("taskDueDateInput"),
  titleError: document.getElementById("titleError"),
  dateError: document.getElementById("dateError"),

  // Delete Confirm Modal
  deleteConfirmModal: document.getElementById("deleteConfirmModal"),
  deleteTaskTitlePreview: document.getElementById("deleteTaskTitlePreview"),
  cancelDeleteBtn: document.getElementById("cancelDeleteBtn"),
  confirmDeleteBtn: document.getElementById("confirmDeleteBtn"),

  // Toast Container
  toastContainer: document.getElementById("toastContainer")
};

// ============================================================================
// 5. Task Operations (CRUD)
// ============================================================================

/**
 * Creates a new task object and adds it to the state.
 */
function addTask({ title, description, priority, dueDate }) {
  const newTask = {
    id: "task-" + Date.now(),
    title: title.trim(),
    description: (description || "").trim(),
    priority: priority || "medium",
    dueDate: dueDate,
    completed: false,
    createdAt: new Date().toISOString()
  };

  state.tasks.unshift(newTask);
  saveTasksToStorage(state.tasks);
  render();
  showToast("Task created successfully!", "success");
}

/**
 * Toggles a task's completed status.
 */
function toggleTaskCompletion(taskId) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;

  task.completed = !task.completed;
  saveTasksToStorage(state.tasks);
  render();

  if (task.completed) {
    showToast("Task marked as completed! 🎉", "success");
  } else {
    showToast("Task moved back to active.", "info");
  }
}

/**
 * Deletes a task by ID.
 */
function deleteTask(taskId) {
  const index = state.tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return;

  const [removedTask] = state.tasks.splice(index, 1);
  saveTasksToStorage(state.tasks);
  render();
  showToast(`"${removedTask.title.slice(0, 24)}..." deleted.`, "danger");
}

// ============================================================================
// 6. Filtering & Sorting Logic
// ============================================================================

/**
 * Returns tasks filtered by status, priority, and search query, then sorted.
 */
function getFilteredAndSortedTasks() {
  return state.tasks
    .filter((task) => {
      // 1. Status Filter: all, active, completed
      if (state.currentFilter === "active" && task.completed) return false;
      if (state.currentFilter === "completed" && !task.completed) return false;

      // 2. Priority Filter: all, high, medium, low
      if (state.priorityFilter !== "all" && task.priority !== state.priorityFilter) {
        return false;
      }

      // 3. Search Query Filter
      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = (task.description || "").toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Sorting Options
      switch (state.sortBy) {
        case "dueDateAsc":
          return new Date(a.dueDate) - new Date(b.dueDate);
        case "dueDateDesc":
          return new Date(b.dueDate) - new Date(a.dueDate);
        case "priority": {
          const priorityWeights = { high: 3, medium: 2, low: 1 };
          return priorityWeights[b.priority] - priorityWeights[a.priority];
        }
        case "newest":
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
}

// ============================================================================
// 7. Rendering Functions
// ============================================================================

/**
 * Main coordinator function that updates all sections of the UI.
 */
function render() {
  renderStats();
  renderFilters();
  renderTaskList();
}

/**
 * Updates summary cards, progress bar, and completion badges.
 */
function renderStats() {
  const total = state.tasks.length;
  const active = state.tasks.filter((t) => !t.completed).length;
  const completed = state.tasks.filter((t) => t.completed).length;
  const highPriority = state.tasks.filter((t) => !t.completed && t.priority === "high").length;
  const medPriority = state.tasks.filter((t) => !t.completed && t.priority === "medium").length;
  const lowPriority = state.tasks.filter((t) => !t.completed && t.priority === "low").length;

  // Header / Summary card numbers
  elements.statTotalCount.textContent = total;
  elements.statActiveCount.textContent = active;
  elements.statCompletedCount.textContent = completed;
  elements.statHighPriorityCount.textContent = highPriority;

  // Sidebar Counts
  elements.sidebarCountAll.textContent = total;
  elements.sidebarCountActive.textContent = active;
  elements.sidebarCountCompleted.textContent = completed;
  elements.sidebarCountHigh.textContent = highPriority;
  elements.sidebarCountMedium.textContent = medPriority;
  elements.sidebarCountLow.textContent = lowPriority;

  // Main Tab Badges
  elements.tabCountAll.textContent = total;
  elements.tabCountActive.textContent = active;
  elements.tabCountCompleted.textContent = completed;

  // Completion Rate Percentage
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  elements.progressBar.style.width = `${percentage}%`;
  elements.completionRateText.textContent = `${percentage}% Completed`;
}

/**
 * Updates active classes on filter tabs & sidebar navigation items.
 */
function renderFilters() {
  // Main tabs
  const tabs = [
    { el: elements.filterTabAll, filter: "all" },
    { el: elements.filterTabActive, filter: "active" },
    { el: elements.filterTabCompleted, filter: "completed" }
  ];

  tabs.forEach(({ el, filter }) => {
    const isActive = state.currentFilter === filter;
    el.classList.toggle("active", isActive);
    el.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  // Sidebar primary navigation
  const sidebarNavBtns = [
    { el: document.getElementById("navFilterAll"), filter: "all" },
    { el: document.getElementById("navFilterActive"), filter: "active" },
    { el: document.getElementById("navFilterCompleted"), filter: "completed" }
  ];

  sidebarNavBtns.forEach(({ el, filter }) => {
    if (el) el.classList.toggle("active", state.currentFilter === filter);
  });

  // Sync priority dropdown
  elements.priorityFilterSelect.value = state.priorityFilter;

  // Active filter banner (visible if priority filter or search is active)
  if (state.priorityFilter !== "all" || state.searchQuery) {
    elements.activeFilterBanner.style.display = "flex";
    const parts = [];
    if (state.priorityFilter !== "all") {
      parts.push(`Priority: ${state.priorityFilter.toUpperCase()}`);
    }
    if (state.searchQuery) {
      parts.push(`Search: "${state.searchQuery}"`);
    }
    elements.activeFilterText.textContent = `Active filter — ${parts.join(" | ")}`;
  } else {
    elements.activeFilterBanner.style.display = "none";
  }
}

/**
 * Formats a due date for display, returning human-friendly status.
 */
function formatDueDate(dueDateStr, isCompleted) {
  if (!dueDateStr) return { text: "No date", statusClass: "" };

  const [year, month, day] = dueDateStr.split("-").map(Number);
  const dueDate = new Date(year, month - 1, day);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const dateTime = dueDate.getTime();
  const todayTime = today.getTime();
  const tomorrowTime = tomorrow.getTime();

  // If completed, just show standard clean date
  if (isCompleted) {
    return {
      text: dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      statusClass: ""
    };
  }

  // Check today / tomorrow / overdue
  if (dateTime === todayTime) {
    return { text: "Due Today", statusClass: "due-today" };
  } else if (dateTime === tomorrowTime) {
    return { text: "Due Tomorrow", statusClass: "" };
  } else if (dateTime < todayTime) {
    return { text: "Overdue", statusClass: "overdue" };
  } else {
    return {
      text: dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      statusClass: ""
    };
  }
}

/**
 * Renders the list of task cards into the DOM.
 */
function renderTaskList() {
  const filteredTasks = getFilteredAndSortedTasks();
  elements.taskList.innerHTML = "";

  if (filteredTasks.length === 0) {
    elements.emptyState.style.display = "flex";

    // Customize empty state message based on active filters
    if (state.searchQuery) {
      elements.emptyStateTitle.textContent = "No matching tasks";
      elements.emptyStateText.textContent = `No tasks matched your search query "${state.searchQuery}".`;
    } else if (state.currentFilter === "completed") {
      elements.emptyStateTitle.textContent = "No completed tasks yet";
      elements.emptyStateText.textContent = "Complete your active tasks to see them archived here.";
    } else if (state.currentFilter === "active") {
      elements.emptyStateTitle.textContent = "All caught up!";
      elements.emptyStateText.textContent = "You don't have any pending tasks right now. Great job!";
    } else {
      elements.emptyStateTitle.textContent = "No tasks found";
      elements.emptyStateText.textContent = "Get started by adding your first task to TaskFlow.";
    }
    return;
  }

  elements.emptyState.style.display = "none";

  filteredTasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = `task-card ${task.completed ? "completed" : ""}`;
    li.setAttribute("data-id", task.id);

    const dateInfo = formatDueDate(task.dueDate, task.completed);

    li.innerHTML = `
      <div class="task-main-col">
        <!-- Toggle Checkbox -->
        <button
          type="button"
          class="task-checkbox-btn ${task.completed ? "checked" : ""}"
          aria-label="${task.completed ? "Mark task as incomplete" : "Mark task as complete"}"
          data-action="toggle"
          data-id="${task.id}"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>

        <!-- Task Info -->
        <div class="task-details">
          <div class="task-title">${escapeHTML(task.title)}</div>
          ${
            task.description
              ? `<div class="task-description">${escapeHTML(task.description)}</div>`
              : ""
          }
        </div>
      </div>

      <div class="task-side-col">
        <!-- Badges (Priority & Due Date) -->
        <div class="task-badges">
          <span class="badge-priority ${task.priority}">
            <span class="priority-dot ${task.priority}"></span>
            ${task.priority}
          </span>
          <span class="badge-date ${dateInfo.statusClass}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            ${dateInfo.text}
          </span>
        </div>

        <!-- Task Actions -->
        <div class="task-actions">
          <button
            type="button"
            class="action-btn delete-btn"
            aria-label="Delete task: ${escapeHTML(task.title)}"
            data-action="delete"
            data-id="${task.id}"
            title="Delete task"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
    `;

    elements.taskList.appendChild(li);
  });
}

/**
 * Sanitizes input text to prevent XSS injection.
 */
function escapeHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================================
// 8. Theme Management
// ============================================================================

/**
 * Applies the given theme ('light' or 'dark') to the application.
 */
function setTheme(theme) {
  state.theme = theme;
  elements.html.setAttribute("data-theme", theme);
  elements.themeToggleText.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
  elements.themeToggleBtn.setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
  );
  saveThemeToStorage(theme);
}

/**
 * Toggles between light and dark themes.
 */
function toggleTheme() {
  const newTheme = state.theme === "dark" ? "light" : "dark";
  setTheme(newTheme);
  showToast(`Switched to ${newTheme} mode`, "info");
}

// ============================================================================
// 9. Modal Management
// ============================================================================

/**
 * Opens the Add Task dialog and initializes default form values.
 */
function openTaskModal() {
  // Clear any previous error states
  elements.titleError.textContent = "";
  elements.dateError.textContent = "";
  elements.taskTitleInput.classList.remove("input-error");
  elements.taskDueDateInput.classList.remove("input-error");

  // Reset form fields
  elements.taskForm.reset();

  // Set default due date to today
  elements.taskDueDateInput.value = getFormattedDateOffset(0);

  // Set default priority radio to medium
  const mediumRadio = elements.taskForm.querySelector('input[name="priority"][value="medium"]');
  if (mediumRadio) mediumRadio.checked = true;

  // Open modal
  if (typeof elements.taskModal.showModal === "function") {
    elements.taskModal.showModal();
  } else {
    elements.taskModal.setAttribute("open", "");
  }

  // Focus title input for fast entry
  setTimeout(() => elements.taskTitleInput.focus(), 50);
}

/**
 * Closes the Add Task dialog.
 */
function closeTaskModal() {
  if (typeof elements.taskModal.close === "function") {
    elements.taskModal.close();
  } else {
    elements.taskModal.removeAttribute("open");
  }
}

/**
 * Opens delete confirmation modal for safety.
 */
function openDeleteModal(taskId) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;

  state.taskPendingDeletion = taskId;
  elements.deleteTaskTitlePreview.textContent = `"${task.title}"`;

  if (typeof elements.deleteConfirmModal.showModal === "function") {
    elements.deleteConfirmModal.showModal();
  } else {
    elements.deleteConfirmModal.setAttribute("open", "");
  }
}

/**
 * Closes delete confirmation modal.
 */
function closeDeleteModal() {
  state.taskPendingDeletion = null;
  if (typeof elements.deleteConfirmModal.close === "function") {
    elements.deleteConfirmModal.close();
  } else {
    elements.deleteConfirmModal.removeAttribute("open");
  }
}

// ============================================================================
// 10. Toast Notification System
// ============================================================================

/**
 * Displays a lightweight toast notification that auto-dismisses.
 * @param {string} message - Notification text
 * @param {'success'|'info'|'danger'} type - Visual variant
 */
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  let iconSVG = "";
  if (type === "success") {
    iconSVG = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    `;
  } else if (type === "danger") {
    iconSVG = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
    `;
  } else {
    iconSVG = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    `;
  }

  toast.innerHTML = `
    <span class="toast-icon">${iconSVG}</span>
    <span class="toast-message">${escapeHTML(message)}</span>
  `;

  elements.toastContainer.appendChild(toast);

  // Auto-remove after 3.2 seconds
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// ============================================================================
// 11. Event Listeners Setup
// ============================================================================
let isListenersAttached = false;

function setupEventListeners() {
  if (isListenersAttached) return;
  isListenersAttached = true;
  // Theme toggle button
  elements.themeToggleBtn.addEventListener("click", toggleTheme);

  // Open modal buttons
  elements.openAddTaskBtn.addEventListener("click", openTaskModal);
  elements.emptyAddTaskBtn.addEventListener("click", openTaskModal);

  // Close modal buttons
  elements.closeModalBtn.addEventListener("click", closeTaskModal);
  elements.cancelModalBtn.addEventListener("click", closeTaskModal);

  // Close modal if user clicks outside modal card (on backdrop)
  elements.taskModal.addEventListener("click", (e) => {
    if (e.target === elements.taskModal) {
      closeTaskModal();
    }
  });

  // Delete modal buttons
  elements.cancelDeleteBtn.addEventListener("click", closeDeleteModal);
  elements.confirmDeleteBtn.addEventListener("click", () => {
    if (state.taskPendingDeletion) {
      deleteTask(state.taskPendingDeletion);
      closeDeleteModal();
    }
  });
  elements.deleteConfirmModal.addEventListener("click", (e) => {
    if (e.target === elements.deleteConfirmModal) {
      closeDeleteModal();
    }
  });

  // Add Task Form Submission
  elements.taskForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = elements.taskTitleInput.value.trim();
    const description = elements.taskDescInput.value.trim();
    const dueDate = elements.taskDueDateInput.value;
    const priority = elements.taskForm.querySelector('input[name="priority"]:checked')?.value || "medium";

    let hasError = false;

    // Validate Title
    if (!title) {
      elements.titleError.textContent = "Please enter a task title.";
      elements.taskTitleInput.classList.add("input-error");
      elements.taskTitleInput.focus();
      hasError = true;
    } else {
      elements.titleError.textContent = "";
      elements.taskTitleInput.classList.remove("input-error");
    }

    // Validate Due Date
    if (!dueDate) {
      elements.dateError.textContent = "Please select a due date.";
      elements.taskDueDateInput.classList.add("input-error");
      if (!hasError) elements.taskDueDateInput.focus();
      hasError = true;
    } else {
      elements.dateError.textContent = "";
      elements.taskDueDateInput.classList.remove("input-error");
    }

    if (hasError) return;

    // Save and close
    addTask({ title, description, priority, dueDate });
    closeTaskModal();
  });

  // Input clear error styling on type
  elements.taskTitleInput.addEventListener("input", () => {
    if (elements.taskTitleInput.value.trim()) {
      elements.titleError.textContent = "";
      elements.taskTitleInput.classList.remove("input-error");
    }
  });

  // Status Filter Tabs (All, Active, Completed)
  const filterTabsContainer = document.querySelector(".filter-tabs");
  if (filterTabsContainer) {
    filterTabsContainer.addEventListener("click", (e) => {
      const tab = e.target.closest(".filter-tab");
      if (!tab) return;
      const filter = tab.dataset.filter;
      if (filter) {
        state.currentFilter = filter;
        render();
      }
    });
  }

  // Sidebar Filter Buttons (All, Active, Completed)
  document.querySelectorAll(".nav-btn[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.currentFilter = btn.dataset.filter;
      render();
      // On mobile, close sidebar after clicking
      closeMobileSidebar();
    });
  });

  // Sidebar Priority Filter Buttons
  document.querySelectorAll(".nav-btn-sub[data-priority]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const priority = btn.dataset.priority;
      state.priorityFilter = state.priorityFilter === priority ? "all" : priority;
      render();
      closeMobileSidebar();
    });
  });

  // Priority Dropdown Select
  elements.priorityFilterSelect.addEventListener("change", (e) => {
    state.priorityFilter = e.target.value;
    render();
  });

  // Sort Dropdown Select
  elements.sortSelect.addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    render();
  });

  // Search Input with Debounce
  let searchTimeout;
  elements.taskSearchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchQuery = e.target.value.trim();
      elements.clearSearchBtn.style.display = state.searchQuery ? "block" : "none";
      render();
    }, 150);
  });

  // Clear Search Button
  elements.clearSearchBtn.addEventListener("click", () => {
    elements.taskSearchInput.value = "";
    state.searchQuery = "";
    elements.clearSearchBtn.style.display = "none";
    render();
    elements.taskSearchInput.focus();
  });

  // Reset Filters Banner Button
  elements.clearFilterBtn.addEventListener("click", () => {
    state.priorityFilter = "all";
    state.searchQuery = "";
    elements.taskSearchInput.value = "";
    elements.clearSearchBtn.style.display = "none";
    elements.priorityFilterSelect.value = "all";
    render();
  });

  // Task List Event Delegation (Clicking checkbox or delete button)
  elements.taskList.addEventListener("click", (e) => {
    // 1. Toggle completion button
    const toggleBtn = e.target.closest('[data-action="toggle"]');
    if (toggleBtn) {
      const taskId = toggleBtn.dataset.id;
      toggleTaskCompletion(taskId);
      return;
    }

    // 2. Delete button
    const deleteBtn = e.target.closest('[data-action="delete"]');
    if (deleteBtn) {
      const taskId = deleteBtn.dataset.id;
      openDeleteModal(taskId);
      return;
    }
  });

  // Mobile Sidebar Drawer Toggle
  elements.mobileMenuBtn.addEventListener("click", openMobileSidebar);
  elements.sidebarCloseBtn.addEventListener("click", closeMobileSidebar);
  elements.sidebarBackdrop.addEventListener("click", closeMobileSidebar);

  // Global Keyboard Shortcuts (e.g. Esc closes modals/sidebar, Alt+N opens Add Task)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMobileSidebar();
    }
    // Alt + N shortcut to open task modal
    if (e.altKey && (e.key === "n" || e.key === "N")) {
      e.preventDefault();
      openTaskModal();
    }
  });
}

function openMobileSidebar() {
  elements.sidebar.classList.add("open");
  elements.sidebarBackdrop.classList.add("active");
  elements.sidebarBackdrop.setAttribute("aria-hidden", "false");
}

function closeMobileSidebar() {
  elements.sidebar.classList.remove("open");
  elements.sidebarBackdrop.classList.remove("active");
  elements.sidebarBackdrop.setAttribute("aria-hidden", "true");
}

/**
 * Formats and displays today's date in the top bar.
 */
function updateDateDisplay() {
  const now = new Date();
  const options = { weekday: "short", month: "short", day: "numeric", year: "numeric" };
  elements.dateText.textContent = now.toLocaleDateString("en-US", options);
}

// ============================================================================
// 12. Application Initialization
// ============================================================================
function init() {
  // 1. Load Theme
  const savedTheme = loadThemeFromStorage();
  setTheme(savedTheme);

  // 2. Load Tasks
  state.tasks = loadTasksFromStorage();

  // 3. Update Current Date
  updateDateDisplay();

  // 4. Attach Event Listeners
  setupEventListeners();

  // 5. Initial Render
  render();

  console.log("TaskFlow initialized successfully with", state.tasks.length, "tasks.");
}

// Boot application when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
