

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
const VALID_CATEGORIES = ["Personal", "Work", "School"];
const DEFAULT_CATEGORY = "Personal";

// ============================================================================
// 1b. Supabase Client Initialization
// ============================================================================
var supabaseClient = null;
try {
  if (
    typeof supabase !== "undefined" &&
    typeof SUPABASE_CONFIG !== "undefined" &&
    SUPABASE_CONFIG.url &&
    SUPABASE_CONFIG.publishableKey
  ) {
    supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.publishableKey);
  }
} catch (err) {
  console.error("Failed to initialize Supabase client:", err.message);
}

/**
 * Normalizes and validates a category name.
 * Falls back to "Personal" if invalid or missing.
 */
function normalizeCategory(category) {
  if (typeof category === "string") {
    const trimmed = category.trim();
    const match = VALID_CATEGORIES.find(
      (c) => c.toLowerCase() === trimmed.toLowerCase()
    );
    if (match) return match;
  }
  return DEFAULT_CATEGORY;
}

const DEFAULT_TASKS = [
  {
    id: "task-1",
    title: "Review Q4 product roadmap & sprint backlog",
    description: "Align with design and engineering leads on key release milestones.",
    category: "Work",
    priority: "high",
    dueDate: getFormattedDateOffset(1), // Tomorrow
    completed: false,
    subtasks: [
      { id: "sub-seed-1", title: "Review milestone deliverable timeline", completed: true },
      { id: "sub-seed-2", title: "Sync with engineering lead on capacity", completed: false }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: "task-2",
    title: "Design user onboarding flow wireframes",
    description: "Draft high-fidelity mockups in Figma for new user signup experience.",
    category: "Work",
    priority: "medium",
    dueDate: getFormattedDateOffset(3), // 3 days from now
    completed: false,
    subtasks: [
      { id: "sub-seed-3", title: "Draft mobile viewport wireframes", completed: false },
      { id: "sub-seed-4", title: "Collect UX feedback from product team", completed: false }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: "task-3",
    title: "Conduct accessibility (a11y) audit for dashboard",
    description: "Check WCAG 2.1 AA color contrast and full keyboard navigation support.",
    category: "School",
    priority: "high",
    dueDate: getFormattedDateOffset(0), // Today
    completed: true,
    subtasks: [],
    createdAt: new Date().toISOString()
  },
  {
    id: "task-4",
    title: "Update API documentation and integration endpoints",
    description: "Ensure Swagger docs accurately reflect all newly added webhook payloads.",
    category: "Personal",
    priority: "low",
    dueDate: getFormattedDateOffset(5), // 5 days from now
    completed: false,
    subtasks: [],
    createdAt: new Date().toISOString()
  },
  {
    id: "task-5",
    title: "Submit compliance and security audit review",
    description: "Annual security documentation review with compliance lead.",
    category: "Work",
    priority: "high",
    dueDate: getFormattedDateOffset(-2), // 2 days ago (Overdue)
    completed: false,
    subtasks: [],
    createdAt: new Date().toISOString()
  }
];

/**
 * Generates a unique task ID.
 * Follows requirement: "task-" + Date.now() + "-" + a random suffix.
 */
function generateTaskId() {
  return "task-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
}

/**
 * Generates a unique subtask ID.
 * Follows requirement: "sub-" + Date.now() + a random suffix.
 */
function generateSubtaskId() {
  return "sub-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
}

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
  categoryFilter: "all",     // 'all' | 'Personal' | 'Work' | 'School'
  priorityFilter: "all",     // 'all' | 'high' | 'medium' | 'low'
  searchQuery: "",
  sortBy: "dueDateAsc",      // 'dueDateAsc' | 'dueDateDesc' | 'priority' | 'newest'
  theme: "dark",             // 'light' | 'dark'
  taskPendingDeletion: null, // Holds task ID during confirmation dialog
  editingTaskId: null,       // Holds task ID when editing an existing task
  isSelectionMode: false,    // Tracks if task selection mode is active
  selectedTaskIds: new Set(), // Set of selected task IDs
  currentUser: null,         // Holds authenticated user object
  authMode: "login",         // 'login' | 'signup'
  isAuthSubmitting: false    // Prevents concurrent auth requests
};
window.state = state;

// ============================================================================
// 3. Storage Helpers (LocalStorage)
// ============================================================================
const STORAGE_KEYS = {
  TASKS: "taskflow_tasks",
  THEME: "taskflow_theme",
  BACKUP_TIP_DISMISSED: "taskflow_backup_tip_dismissed"
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
    if (Array.isArray(parsed)) {
      // Backward compatibility: ensure existing saved tasks have a valid category and subtasks array
      return parsed.map((task) => ({
        ...task,
        category: normalizeCategory(task.category),
        subtasks: Array.isArray(task.subtasks)
          ? task.subtasks.map((st) => ({
              id: st.id || generateSubtaskId(),
              title: typeof st.title === "string" ? st.title.trim().slice(0, 100) : "",
              completed: Boolean(st.completed)
            }))
          : []
      }));
    }
    return [...DEFAULT_TASKS];
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
  // Auth Elements & Screens
  appLoadingScreen: document.getElementById("appLoadingScreen"),
  authScreen: document.getElementById("authScreen"),
  appContainer: document.getElementById("appContainer"),
  authThemeToggleBtn: document.getElementById("authThemeToggleBtn"),
  authThemeToggleText: document.getElementById("authThemeToggleText"),
  authTitle: document.getElementById("authTitle"),
  authSubtitle: document.getElementById("authSubtitle"),
  authAlertDanger: document.getElementById("authAlertDanger"),
  authAlertInfo: document.getElementById("authAlertInfo"),
  authForm: document.getElementById("authForm"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  authSubmitBtn: document.getElementById("authSubmitBtn"),
  authSubmitBtnText: document.getElementById("authSubmitBtnText"),
  authSwitchPrompt: document.getElementById("authSwitchPrompt"),
  authSwitchBtn: document.getElementById("authSwitchBtn"),

  // User Account in Topbar
  userAccountBadge: document.getElementById("userAccountBadge"),
  userEmailText: document.getElementById("userEmailText"),
  logoutBtn: document.getElementById("logoutBtn"),

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
  categoryFilterSelect: document.getElementById("categoryFilterSelect"),
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

  // Add / Edit Task Modal
  taskModal: document.getElementById("taskModal"),
  modalTitle: document.getElementById("modalTitle"),
  modalSubtitle: document.querySelector(".modal-subtitle"),
  openAddTaskBtn: document.getElementById("openAddTaskBtn"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  cancelModalBtn: document.getElementById("cancelModalBtn"),
  taskForm: document.getElementById("taskForm"),
  taskTitleInput: document.getElementById("taskTitleInput"),
  taskDescInput: document.getElementById("taskDescInput"),
  taskCategorySelect: document.getElementById("taskCategorySelect"),
  taskDueDateInput: document.getElementById("taskDueDateInput"),
  subtaskInput: document.getElementById("subtaskInput"),
  addSubtaskBtn: document.getElementById("addSubtaskBtn"),
  modalSubtasksCount: document.getElementById("modalSubtasksCount"),
  modalSubtaskList: document.getElementById("modalSubtaskList"),
  titleError: document.getElementById("titleError"),
  dateError: document.getElementById("dateError"),
  saveTaskSubmitBtn: document.getElementById("saveTaskSubmitBtn"),
  saveTaskBtnText: document.getElementById("saveTaskBtnText"),

  // Delete Confirm Modal
  deleteConfirmModal: document.getElementById("deleteConfirmModal"),
  deleteTaskTitlePreview: document.getElementById("deleteTaskTitlePreview"),
  cancelDeleteBtn: document.getElementById("cancelDeleteBtn"),
  confirmDeleteBtn: document.getElementById("confirmDeleteBtn"),

  // Backup Dropdown & Storage Tip
  backupDropdownWrapper: document.getElementById("backupDropdownWrapper"),
  backupMenuBtn: document.getElementById("backupMenuBtn"),
  backupDropdownMenu: document.getElementById("backupDropdownMenu"),
  storageTipBanner: document.getElementById("storageTipBanner"),
  dismissStorageTipBtn: document.getElementById("dismissStorageTipBtn"),

  // Topbar Backup Actions (dropdown items & hidden file input)
  importTasksBtn: document.getElementById("importTasksBtn"),
  importFileInput: document.getElementById("importFileInput"),
  exportTasksBtn: document.getElementById("exportTasksBtn"),

  // Task Selection Bar
  selectTasksToSaveBtn: document.getElementById("selectTasksToSaveBtn"),
  taskSelectionBar: document.getElementById("taskSelectionBar"),
  selectionCountText: document.getElementById("selectionCountText"),
  selectionHiddenNote: document.getElementById("selectionHiddenNote"),
  selectAllShownBtn: document.getElementById("selectAllShownBtn"),
  saveSelectedBtn: document.getElementById("saveSelectedBtn"),
  cancelSelectionBtn: document.getElementById("cancelSelectionBtn"),

  // Restore Tasks Modal
  importModal: document.getElementById("importModal"),
  importSummaryPreview: document.getElementById("importSummaryPreview"),
  cancelImportBtn: document.getElementById("cancelImportBtn"),
  mergeImportBtn: document.getElementById("mergeImportBtn"),
  replaceImportBtn: document.getElementById("replaceImportBtn"),

  // Toast Container
  toastContainer: document.getElementById("toastContainer")
};

// ============================================================================
// 5. Task Operations (CRUD)
// ============================================================================

/**
 * Creates a new task object and adds it to the state.
 */
function addTask({ title, description, priority, dueDate, category, subtasks = [] }) {
  const newTask = {
    id: generateTaskId(),
    title: title.trim(),
    description: (description || "").trim(),
    category: normalizeCategory(category),
    priority: priority || "medium",
    dueDate: dueDate,
    completed: false,
    subtasks: Array.isArray(subtasks) ? subtasks : [],
    createdAt: new Date().toISOString()
  };

  state.tasks.unshift(newTask);
  saveTasksToStorage(state.tasks);
  render();
  showToast("Task created successfully!", "success");
}

/**
 * Updates an existing task with new data.
 */
function updateTask(taskId, { title, description, priority, dueDate, category, subtasks }) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;

  task.title = title.trim();
  task.description = (description || "").trim();
  task.category = normalizeCategory(category);
  task.priority = priority || "medium";
  task.dueDate = dueDate;
  if (Array.isArray(subtasks)) {
    task.subtasks = subtasks;
  }
  task.updatedAt = new Date().toISOString();

  saveTasksToStorage(state.tasks);
  render();
  showToast("Task updated successfully! ✨", "success");
}

/**
 * Toggles a subtask's completion status without affecting parent task completion.
 * Immediately persists to LocalStorage and updates the card.
 */
function toggleSubtaskCompletion(taskId, subtaskId) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task || !Array.isArray(task.subtasks)) return;

  const subtask = task.subtasks.find((st) => st.id === subtaskId);
  if (!subtask) return;

  subtask.completed = !subtask.completed;
  saveTasksToStorage(state.tasks);
  renderTaskList();
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
  if (state.selectedTaskIds.has(taskId)) {
    state.selectedTaskIds.delete(taskId);
  }
  pruneSelectedTaskIds();
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

      // 2. Category Filter: all, Work, Personal, School
      if (state.categoryFilter !== "all") {
        const taskCategory = normalizeCategory(task.category);
        if (taskCategory.toLowerCase() !== state.categoryFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Priority Filter: all, high, medium, low
      if (state.priorityFilter !== "all" && task.priority !== state.priorityFilter) {
        return false;
      }

      // 4. Search Query Filter
      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = (task.description || "").toLowerCase().includes(query);
        const matchesCat = (task.category || "").toLowerCase().includes(query);
        const matchesSubtasks =
          Array.isArray(task.subtasks) &&
          task.subtasks.some((st) => (st.title || "").toLowerCase().includes(query));
        if (!matchesTitle && !matchesDesc && !matchesCat && !matchesSubtasks) return false;
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
  if (state.isSelectionMode) {
    renderSelectionBar();
  }
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

  // Sync category & priority dropdowns
  if (elements.categoryFilterSelect) {
    elements.categoryFilterSelect.value = state.categoryFilter;
  }
  elements.priorityFilterSelect.value = state.priorityFilter;

  // Active filter banner (visible if category, priority filter or search is active)
  const isCategoryFiltered = state.categoryFilter !== "all";
  const isPriorityFiltered = state.priorityFilter !== "all";
  if (isCategoryFiltered || isPriorityFiltered || state.searchQuery) {
    elements.activeFilterBanner.style.display = "flex";
    const parts = [];
    if (isCategoryFiltered) {
      parts.push(`Category: ${state.categoryFilter}`);
    }
    if (isPriorityFiltered) {
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
  if (!dueDateStr) return { text: "No date", statusClass: "", isOverdue: false };

  const [year, month, day] = dueDateStr.split("-").map(Number);
  const dueDate = new Date(year, month - 1, day);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dateTime = dueDate.getTime();
  const todayTime = today.getTime();
  const tomorrowTime = tomorrow.getTime();

  const formattedDate = dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // If completed, just show standard clean date
  if (isCompleted) {
    return {
      text: formattedDate,
      statusClass: "",
      isOverdue: false
    };
  }

  // Check today / tomorrow / overdue
  if (dateTime === todayTime) {
    return { text: "Due Today", statusClass: "due-today", isOverdue: false };
  } else if (dateTime === tomorrowTime) {
    return { text: "Due Tomorrow", statusClass: "", isOverdue: false };
  } else if (dateTime < todayTime) {
    return { text: `Overdue · ${formattedDate}`, statusClass: "overdue", isOverdue: true };
  } else {
    return {
      text: formattedDate,
      statusClass: "",
      isOverdue: false
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

    // Customize empty state message based on active filters or general empty list
    if (state.tasks.length === 0) {
      elements.emptyStateTitle.textContent = "No tasks yet";
      elements.emptyStateText.textContent = "Add a task to get started.";
    } else if (state.searchQuery) {
      elements.emptyStateTitle.textContent = "No matching tasks";
      elements.emptyStateText.textContent = `No tasks matched your search query "${state.searchQuery}".`;
    } else if (state.categoryFilter !== "all") {
      elements.emptyStateTitle.textContent = `No ${state.categoryFilter} tasks`;
      elements.emptyStateText.textContent = `You don't have any tasks in the ${state.categoryFilter} category matching your filters.`;
    } else if (state.currentFilter === "completed") {
      elements.emptyStateTitle.textContent = "No completed tasks yet";
      elements.emptyStateText.textContent = "Complete your active tasks to see them archived here.";
    } else if (state.currentFilter === "active") {
      elements.emptyStateTitle.textContent = "All caught up!";
      elements.emptyStateText.textContent = "You don't have any pending tasks right now. Great job!";
    } else {
      elements.emptyStateTitle.textContent = "No tasks yet";
      elements.emptyStateText.textContent = "Add a task to get started.";
    }
    return;
  }

  elements.emptyState.style.display = "none";

  filteredTasks.forEach((task) => {
    const li = document.createElement("li");
    const dateInfo = formatDueDate(task.dueDate, task.completed);
    const isOverdue = !task.completed && dateInfo.isOverdue;
    const taskCategory = normalizeCategory(task.category);
    const isSelected = state.isSelectionMode && state.selectedTaskIds.has(task.id);
    const btnDisabledAttr = state.isSelectionMode ? "disabled" : "";

    li.className = `task-card ${task.completed ? "completed" : ""} ${isOverdue ? "overdue" : ""} ${isSelected ? "selected" : ""}`;
    li.setAttribute("data-id", task.id);

    const hasSubtasks = Array.isArray(task.subtasks) && task.subtasks.length > 0;
    const completedSubtasks = hasSubtasks ? task.subtasks.filter((st) => st.completed).length : 0;
    const totalSubtasks = hasSubtasks ? task.subtasks.length : 0;
    const progressPercent = totalSubtasks === 0 ? 0 : Math.round((completedSubtasks / totalSubtasks) * 100);

    const subtasksHTML = hasSubtasks
      ? `
        <div class="task-subtasks-container">
          <div class="subtasks-progress-header">
            <span class="subtasks-progress-title">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              Subtasks
            </span>
            <span class="subtasks-progress-label">${completedSubtasks}/${totalSubtasks}</span>
          </div>
          <div class="subtasks-progress-track" role="progressbar" aria-valuenow="${progressPercent}" aria-valuemin="0" aria-valuemax="100" aria-label="Subtasks completion progress">
            <div class="subtasks-progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <ul class="task-subtasks-list">
            ${task.subtasks
              .map(
                (st) => `
              <li class="task-subtask-item ${st.completed ? "completed" : ""}">
                <button
                  type="button"
                  class="subtask-checkbox-btn ${st.completed ? "checked" : ""}"
                  aria-label="${st.completed ? "Mark subtask incomplete" : "Mark subtask complete"}: ${escapeHTML(st.title)}"
                  data-action="toggle-subtask"
                  data-task-id="${escapeHTML(task.id)}"
                  data-subtask-id="${escapeHTML(st.id)}"
                  ${btnDisabledAttr}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </button>
                <span class="subtask-text" data-action="toggle-subtask" data-task-id="${escapeHTML(task.id)}" data-subtask-id="${escapeHTML(st.id)}">${escapeHTML(st.title)}</span>
              </li>
            `
              )
              .join("")}
          </ul>
        </div>
      `
      : "";

    li.innerHTML = `
      <div class="task-main-col">
        ${
          state.isSelectionMode
            ? `
          <input
            type="checkbox"
            class="task-select-checkbox"
            data-action="select-task"
            data-id="${escapeHTML(task.id)}"
            aria-label="Select task: ${escapeHTML(task.title)}"
            ${isSelected ? "checked" : ""}
          >
        `
            : ""
        }
        <!-- Toggle Checkbox -->
        <button
          type="button"
          class="task-checkbox-btn ${task.completed ? "checked" : ""}"
          aria-label="${task.completed ? "Mark task as incomplete" : "Mark task as complete"}"
          data-action="toggle"
          data-id="${task.id}"
          ${btnDisabledAttr}
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
          ${subtasksHTML}
        </div>
      </div>

      <div class="task-side-col">
        <!-- Badges (Category, Priority & Due Date) -->
        <div class="task-badges">
          <span class="badge-category ${taskCategory.toLowerCase()}">
            ${escapeHTML(taskCategory)}
          </span>
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
            class="action-btn edit-btn"
            aria-label="Edit task: ${escapeHTML(task.title)}"
            data-action="edit"
            data-id="${task.id}"
            title="Edit task"
            ${btnDisabledAttr}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button
            type="button"
            class="action-btn delete-btn"
            aria-label="Delete task: ${escapeHTML(task.title)}"
            data-action="delete"
            data-id="${task.id}"
            title="Delete task"
            ${btnDisabledAttr}
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

  if (state.isSelectionMode) {
    renderSelectionBar();
  }
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
  if (elements.themeToggleText) {
    elements.themeToggleText.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
  }
  if (elements.themeToggleBtn) {
    elements.themeToggleBtn.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
    );
  }
  if (elements.authThemeToggleText) {
    elements.authThemeToggleText.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
  }
  if (elements.authThemeToggleBtn) {
    elements.authThemeToggleBtn.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
    );
  }
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
// 9. Modal Management & Subtasks State
// ============================================================================
let modalSubtasks = [];

/**
 * Renders the list of subtasks in the Add/Edit Task modal.
 * Escapes user text to prevent XSS. Every remove button is type="button".
 */
function renderModalSubtasks() {
  if (!elements.modalSubtaskList || !elements.modalSubtasksCount) return;

  const count = modalSubtasks.length;
  elements.modalSubtasksCount.textContent = `${count} ${count === 1 ? "item" : "items"}`;
  elements.modalSubtaskList.innerHTML = "";

  modalSubtasks.forEach((st) => {
    const li = document.createElement("li");
    li.className = "modal-subtask-item";
    li.innerHTML = `
      <span class="modal-subtask-icon">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 11 12 14 22 4"></polyline>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>
      </span>
      <span class="modal-subtask-title">${escapeHTML(st.title)}</span>
      <button
        type="button"
        class="modal-subtask-remove-btn"
        data-action="remove-subtask"
        data-id="${escapeHTML(st.id)}"
        aria-label="Remove checklist item: ${escapeHTML(st.title)}"
        title="Remove item"
      >
        &times;
      </button>
    `;
    elements.modalSubtaskList.appendChild(li);
  });
}

/**
 * Adds a subtask from modal input field.
 * Validates non-empty, trimmed, and limits to 100 characters max.
 */
function addSubtaskFromModal() {
  if (!elements.subtaskInput) return;
  const rawTitle = elements.subtaskInput.value.trim();
  if (!rawTitle) return;

  const title = rawTitle.slice(0, 100);
  modalSubtasks.push({
    id: generateSubtaskId(),
    title: title,
    completed: false
  });

  elements.subtaskInput.value = "";
  renderModalSubtasks();
  elements.subtaskInput.focus();
}

/**
 * Removes a subtask from modal list by ID.
 */
function removeSubtaskFromModal(subtaskId) {
  modalSubtasks = modalSubtasks.filter((st) => st.id !== subtaskId);
  renderModalSubtasks();
}

/**
 * Opens the Add Task dialog and initializes default form values.
 */
function openTaskModal() {
  state.editingTaskId = null;

  // Clear any previous error states
  elements.titleError.textContent = "";
  elements.dateError.textContent = "";
  elements.taskTitleInput.classList.remove("input-error");
  elements.taskDueDateInput.classList.remove("input-error");

  // Reset form fields
  elements.taskForm.reset();

  // Reset subtasks for modal
  modalSubtasks = [];
  if (elements.subtaskInput) elements.subtaskInput.value = "";
  renderModalSubtasks();

  // Set default category to Personal
  if (elements.taskCategorySelect) {
    elements.taskCategorySelect.value = DEFAULT_CATEGORY;
  }

  // Set default due date to today
  elements.taskDueDateInput.value = getFormattedDateOffset(0);

  // Set default priority radio to medium
  const mediumRadio = elements.taskForm.querySelector('input[name="priority"][value="medium"]');
  if (mediumRadio) mediumRadio.checked = true;

  // Update modal header & button text for Add mode
  if (elements.modalTitle) elements.modalTitle.textContent = "Create New Task";
  if (elements.modalSubtitle) elements.modalSubtitle.textContent = "Add details to organize and schedule your new task.";
  if (elements.saveTaskBtnText) elements.saveTaskBtnText.textContent = "Save Task";

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
 * Opens the Task Modal in Edit Mode, pre-populating with existing task data.
 */
function openEditTaskModal(taskId) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;

  state.editingTaskId = taskId;

  // Clear any previous error states
  elements.titleError.textContent = "";
  elements.dateError.textContent = "";
  elements.taskTitleInput.classList.remove("input-error");
  elements.taskDueDateInput.classList.remove("input-error");

  // Pre-fill form fields with existing values
  elements.taskTitleInput.value = task.title || "";
  elements.taskDescInput.value = task.description || "";
  elements.taskDueDateInput.value = task.dueDate || "";

  // Pre-fill subtasks for modal
  modalSubtasks = Array.isArray(task.subtasks)
    ? task.subtasks.map((st) => ({ ...st }))
    : [];
  if (elements.subtaskInput) elements.subtaskInput.value = "";
  renderModalSubtasks();

  // Pre-fill category selector
  if (elements.taskCategorySelect) {
    elements.taskCategorySelect.value = normalizeCategory(task.category);
  }

  // Select the matching priority radio
  const priorityRadio = elements.taskForm.querySelector(
    `input[name="priority"][value="${task.priority || "medium"}"]`
  );
  if (priorityRadio) priorityRadio.checked = true;

  // Update modal header & button for Edit mode
  if (elements.modalTitle) elements.modalTitle.textContent = "Edit Task";
  if (elements.modalSubtitle) elements.modalSubtitle.textContent = "Update task details, priority, and deadline.";
  if (elements.saveTaskBtnText) elements.saveTaskBtnText.textContent = "Update Task";

  // Open modal
  if (typeof elements.taskModal.showModal === "function") {
    elements.taskModal.showModal();
  } else {
    elements.taskModal.setAttribute("open", "");
  }

  // Focus title input
  setTimeout(() => elements.taskTitleInput.focus(), 50);
}

/**
 * Closes the Add/Edit Task dialog.
 */
function closeTaskModal() {
  state.editingTaskId = null;
  modalSubtasks = [];
  if (elements.subtaskInput) elements.subtaskInput.value = "";
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
// 10. Backup & Restore Management
// ============================================================================
const INVALID_BACKUP_MSG = "This file isn't a TaskFlow backup. Please choose the file you saved from TaskFlow.";
let pendingImportTasks = [];

/**
 * Saves a copy of all tasks (with subtasks) as a downloadable file.
 * Filename format: taskflow-backup-YYYY-MM-DD.json
 */
function exportTasks() {
  if (state.tasks.length === 0) {
    showToast("You have no tasks to save yet.", "info");
    return;
  }

  try {
    const jsonStr = JSON.stringify(state.tasks, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const dateStr = getFormattedDateOffset(0);
    const filename = `taskflow-backup-${dateStr}.json`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Revoke the object URL after triggering download
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);

    showToast("Your tasks were saved to a file. Keep it somewhere safe.", "success");
  } catch (err) {
    console.error("Backup failed:", err);
    showToast("Could not save your tasks. Please try again.", "danger");
  }
}

// ============================================================================
// 10b. Task Selection Mode & Save Selected Tasks
// ============================================================================

/**
 * Starts task selection mode.
 */
function startSelectionMode() {
  state.isSelectionMode = true;
  state.selectedTaskIds.clear();
  if (elements.taskSelectionBar) {
    elements.taskSelectionBar.style.display = "flex";
  }
  renderTaskList();
  renderSelectionBar();
}

/**
 * Exits task selection mode and clears any active selection.
 */
function exitSelectionMode() {
  state.isSelectionMode = false;
  state.selectedTaskIds.clear();
  if (elements.taskSelectionBar) {
    elements.taskSelectionBar.style.display = "none";
  }
  renderTaskList();
}

/**
 * Removes any IDs from selectedTaskIds that no longer exist in state.tasks.
 */
function pruneSelectedTaskIds() {
  const existingIds = new Set(state.tasks.map((t) => t.id));
  for (const id of state.selectedTaskIds) {
    if (!existingIds.has(id)) {
      state.selectedTaskIds.delete(id);
    }
  }
}

/**
 * Toggles selection of a task by ID.
 * Optionally forces a specific boolean state.
 */
function toggleTaskSelection(taskId, forceState) {
  if (!taskId) return;
  const shouldSelect =
    typeof forceState === "boolean"
      ? forceState
      : !state.selectedTaskIds.has(taskId);

  if (shouldSelect) {
    state.selectedTaskIds.add(taskId);
  } else {
    state.selectedTaskIds.delete(taskId);
  }

  // Update card directly in the DOM
  const card = elements.taskList.querySelector(`li.task-card[data-id="${taskId}"]`);
  if (card) {
    card.classList.toggle("selected", shouldSelect);
    const checkbox = card.querySelector(".task-select-checkbox");
    if (checkbox) {
      checkbox.checked = shouldSelect;
    }
  }

  renderSelectionBar();
}

/**
 * Selects all tasks currently visible after applying active filters and search.
 */
function selectAllShownTasks() {
  const visibleTasks = getFilteredAndSortedTasks();
  visibleTasks.forEach((task) => {
    state.selectedTaskIds.add(task.id);
  });

  visibleTasks.forEach((task) => {
    const card = elements.taskList.querySelector(`li.task-card[data-id="${task.id}"]`);
    if (card) {
      card.classList.add("selected");
      const checkbox = card.querySelector(".task-select-checkbox");
      if (checkbox) checkbox.checked = true;
    }
  });

  renderSelectionBar();
}

/**
 * Renders the selection bar count, hidden items notification, and button state.
 */
function renderSelectionBar() {
  if (!state.isSelectionMode || !elements.taskSelectionBar) return;
  pruneSelectedTaskIds();

  const totalSelected = state.selectedTaskIds.size;
  if (elements.selectionCountText) {
    elements.selectionCountText.textContent = `${totalSelected} selected`;
  }

  if (elements.saveSelectedBtn) {
    elements.saveSelectedBtn.disabled = totalSelected === 0;
  }

  // Hidden selections: if some selected tasks are hidden by current filters or search,
  // show a note like "2 of your 5 selected tasks are hidden by filters"
  const visibleTasks = getFilteredAndSortedTasks();
  const visibleSelected = visibleTasks.filter((t) => state.selectedTaskIds.has(t.id)).length;
  const hiddenCount = totalSelected - visibleSelected;

  if (elements.selectionHiddenNote) {
    if (hiddenCount > 0) {
      elements.selectionHiddenNote.style.display = "block";
      const noun = totalSelected === 1 ? "task is" : "tasks are";
      elements.selectionHiddenNote.textContent = `${hiddenCount} of your ${totalSelected} selected ${noun} hidden by filters`;
    } else {
      elements.selectionHiddenNote.style.display = "none";
      elements.selectionHiddenNote.textContent = "";
    }
  }
}

/**
 * Downloads selected tasks as taskflow-selected-YYYY-MM-DD.json in identical format to full backup.
 */
function saveSelectedTasks() {
  pruneSelectedTaskIds();
  const selectedTasks = state.tasks.filter((t) => state.selectedTaskIds.has(t.id));
  if (selectedTasks.length === 0) {
    showToast("You have no tasks selected to save.", "info");
    return;
  }

  try {
    const jsonStr = JSON.stringify(selectedTasks, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const dateStr = getFormattedDateOffset(0);
    const filename = `taskflow-selected-${dateStr}.json`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);

    const count = selectedTasks.length;
    showToast(`Saved ${count} ${count === 1 ? "task" : "tasks"} to a file. Keep it somewhere safe.`, "success");

    exitSelectionMode();
  } catch (err) {
    console.error("Save selected tasks failed:", err);
    showToast("Could not save your tasks. Please try again.", "danger");
  }
}

/**
 * Opens the Restore Modal dialog with a preview summary and replace warning.
 */
function openImportModal(validTasks) {
  pendingImportTasks = validTasks;
  const currentCount = state.tasks.length;
  const countText = `This file has ${validTasks.length} ${validTasks.length === 1 ? "task" : "tasks"}.`;
  const warningText = `Replace will delete your current ${currentCount} ${currentCount === 1 ? "task" : "tasks"}.`;

  elements.importSummaryPreview.innerHTML = `
    <div class="import-preview-stats">
      ${escapeHTML(countText)}
    </div>
    <div class="import-preview-warning">
      ⚠️ ${escapeHTML(warningText)}
    </div>
  `;

  if (typeof elements.importModal.showModal === "function") {
    elements.importModal.showModal();
  } else {
    elements.importModal.setAttribute("open", "");
  }
}

/**
 * Closes the Restore Modal dialog and resets pending import data.
 */
function closeImportModal() {
  pendingImportTasks = [];
  if (elements.importFileInput) {
    elements.importFileInput.value = "";
  }
  if (typeof elements.importModal.close === "function") {
    elements.importModal.close();
  } else {
    elements.importModal.removeAttribute("open");
  }
}

/**
 * Validates, normalizes, and whitelists backup task data.
 */
function processImportedJson(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    showToast(INVALID_BACKUP_MSG, "danger");
    return;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    showToast(INVALID_BACKUP_MSG, "danger");
    return;
  }

  const validTasks = [];
  const seenTaskIds = new Set();

  for (const rawTask of parsed) {
    // 1. Must be a non-null object (not array)
    if (!rawTask || typeof rawTask !== "object" || Array.isArray(rawTask)) {
      showToast(INVALID_BACKUP_MSG, "danger");
      return;
    }

    // 2. Title validation: string, non-empty after trimming
    if (typeof rawTask.title !== "string" || !rawTask.title.trim()) {
      showToast(INVALID_BACKUP_MSG, "danger");
      return;
    }

    // 3. Category validation: valid known category
    if (
      typeof rawTask.category !== "string" ||
      !VALID_CATEGORIES.some((c) => c.toLowerCase() === rawTask.category.trim().toLowerCase())
    ) {
      showToast(INVALID_BACKUP_MSG, "danger");
      return;
    }

    // 4. Priority validation: high, medium, low
    if (
      typeof rawTask.priority !== "string" ||
      !["high", "medium", "low"].includes(rawTask.priority.trim().toLowerCase())
    ) {
      showToast(INVALID_BACKUP_MSG, "danger");
      return;
    }

    // 5. Due date validation: YYYY-MM-DD
    const dueDateStr = typeof rawTask.dueDate === "string" ? rawTask.dueDate.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDateStr) || isNaN(Date.parse(dueDateStr))) {
      showToast(INVALID_BACKUP_MSG, "danger");
      return;
    }

    // 6. Completed validation: must be boolean
    if (typeof rawTask.completed !== "boolean") {
      showToast(INVALID_BACKUP_MSG, "danger");
      return;
    }

    // 7. Subtasks validation (optional)
    if (rawTask.subtasks !== undefined && !Array.isArray(rawTask.subtasks)) {
      showToast(INVALID_BACKUP_MSG, "danger");
      return;
    }

    // 8. ID deduplication within the backup file itself
    let taskId = typeof rawTask.id === "string" && rawTask.id.trim() ? rawTask.id.trim() : "";
    if (!taskId || seenTaskIds.has(taskId)) {
      taskId = generateTaskId();
    }
    seenTaskIds.add(taskId);

    // 9. Subtask normalization & ID deduplication
    const seenSubtaskIds = new Set();
    const normalizedSubtasks = Array.isArray(rawTask.subtasks)
      ? rawTask.subtasks.map((st) => {
          let stId = typeof st.id === "string" && st.id.trim() ? st.id.trim() : "";
          if (!stId || seenSubtaskIds.has(stId)) {
            stId = generateSubtaskId();
          }
          seenSubtaskIds.add(stId);
          return {
            id: stId,
            title: typeof st.title === "string" ? st.title.trim().slice(0, 100) : "",
            completed: Boolean(st.completed)
          };
        })
      : [];

    // 10. Whitelist known fields only and enforce limits:
    // title max 120 chars, description max 400 chars, subtask title max 100 chars
    const normalizedTask = {
      id: taskId,
      title: rawTask.title.trim().slice(0, 120),
      description: typeof rawTask.description === "string" ? rawTask.description.trim().slice(0, 400) : "",
      category: normalizeCategory(rawTask.category),
      priority: rawTask.priority.trim().toLowerCase(),
      dueDate: dueDateStr,
      completed: Boolean(rawTask.completed),
      createdAt:
        typeof rawTask.createdAt === "string" && rawTask.createdAt.trim()
          ? rawTask.createdAt.trim()
          : new Date().toISOString(),
      subtasks: normalizedSubtasks
    };

    if (typeof rawTask.updatedAt === "string" && rawTask.updatedAt.trim()) {
      normalizedTask.updatedAt = rawTask.updatedAt.trim();
    }

    validTasks.push(normalizedTask);
  }

  // Open confirmation modal
  openImportModal(validTasks);
}

/**
 * Handles file reading from the file picker with try/catch.
 */
async function handleImportFile(file) {
  if (!file) return;

  try {
    const text = await file.text();
    processImportedJson(text);
  } catch (err) {
    console.error("Failed to read backup file:", err);
    showToast(INVALID_BACKUP_MSG, "danger");
  }
}

/**
 * Adds missing tasks from backup to current tasks.
 */
function applyImportMerge() {
  if (pendingImportTasks.length === 0) {
    closeImportModal();
    return;
  }

  const existingIds = new Set(state.tasks.map((t) => t.id));
  const newTasks = pendingImportTasks.filter((t) => !existingIds.has(t.id));

  state.tasks = [...newTasks, ...state.tasks];
  pruneSelectedTaskIds();

  try {
    saveTasksToStorage(state.tasks);
    render();
    if (newTasks.length === 0) {
      showToast(
        `Nothing new to add. All ${pendingImportTasks.length} ${pendingImportTasks.length === 1 ? "task" : "tasks"} in this file are already in TaskFlow.`,
        "info"
      );
    } else {
      showToast(`Added ${newTasks.length} ${newTasks.length === 1 ? "task" : "tasks"}.`, "success");
    }
  } catch (err) {
    console.error("Failed to save tasks:", err);
    showToast("Could not save your tasks. Please try again.", "danger");
  }

  closeImportModal();
}

/**
 * Replaces all current tasks with tasks from the backup.
 */
function applyImportReplace() {
  if (pendingImportTasks.length === 0) {
    closeImportModal();
    return;
  }

  state.tasks = [...pendingImportTasks];
  pruneSelectedTaskIds();

  try {
    saveTasksToStorage(state.tasks);
    render();
    showToast("Your tasks were restored.", "success");
  } catch (err) {
    console.error("Failed to save tasks:", err);
    showToast("Could not save your tasks. Please try again.", "danger");
  }

  closeImportModal();
}

/**
 * Closes the Backup dropdown menu.
 */
function closeBackupMenu(returnFocusToBtn = false) {
  if (!elements.backupMenuBtn || !elements.backupDropdownMenu || !elements.backupDropdownWrapper) return;
  elements.backupDropdownMenu.setAttribute("hidden", "");
  elements.backupMenuBtn.setAttribute("aria-expanded", "false");
  elements.backupDropdownWrapper.removeAttribute("data-open");
  if (returnFocusToBtn) {
    elements.backupMenuBtn.focus();
  }
}

/**
 * Opens the Backup dropdown menu and moves focus to first item.
 */
function openBackupMenu() {
  if (!elements.backupMenuBtn || !elements.backupDropdownMenu || !elements.backupDropdownWrapper) return;
  elements.backupDropdownMenu.removeAttribute("hidden");
  elements.backupMenuBtn.setAttribute("aria-expanded", "true");
  elements.backupDropdownWrapper.setAttribute("data-open", "true");
  const firstItem = elements.backupDropdownMenu.querySelector(".backup-menu-item");
  if (firstItem) {
    firstItem.focus();
  }
}

/**
 * Returns whether Backup dropdown menu is currently open.
 */
function isBackupMenuOpen() {
  return elements.backupMenuBtn && elements.backupMenuBtn.getAttribute("aria-expanded") === "true";
}

/**
 * Setup Backup dropdown menu keyboard & click interactions.
 */
function setupBackupDropdown() {
  const wrapper = elements.backupDropdownWrapper;
  const btn = elements.backupMenuBtn;
  const items = [elements.exportTasksBtn, elements.selectTasksToSaveBtn, elements.importTasksBtn].filter(Boolean);

  if (!wrapper || !btn) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isBackupMenuOpen()) {
      closeBackupMenu(false);
    } else {
      openBackupMenu();
    }
  });

  // Keyboard navigation within the dropdown
  wrapper.addEventListener("keydown", (e) => {
    if (!isBackupMenuOpen()) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openBackupMenu();
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeBackupMenu(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const currentIndex = items.indexOf(document.activeElement);
      const nextIndex = currentIndex === -1 || currentIndex === items.length - 1 ? 0 : currentIndex + 1;
      items[nextIndex].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const currentIndex = items.indexOf(document.activeElement);
      const prevIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
      items[prevIndex].focus();
    } else if (e.key === "Tab") {
      closeBackupMenu(false);
    }
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (isBackupMenuOpen() && !wrapper.contains(e.target)) {
      closeBackupMenu(false);
    }
  });

  // When an item is chosen, close menu and return focus to Backup button
  items.forEach((item) => {
    item.addEventListener("click", () => {
      closeBackupMenu(true);
    });
  });

  // Save selected tasks option
  if (elements.selectTasksToSaveBtn) {
    elements.selectTasksToSaveBtn.addEventListener("click", () => {
      startSelectionMode();
    });
  }
}

/**
 * Initializes the dismissible browser storage tip banner.
 */
function initStorageTip() {
  if (!elements.storageTipBanner) return;

  let isDismissed = false;
  try {
    isDismissed = localStorage.getItem(STORAGE_KEYS.BACKUP_TIP_DISMISSED) === "true";
  } catch (e) {
    console.warn("Storage access failed for backup tip:", e);
  }

  if (!isDismissed) {
    elements.storageTipBanner.style.display = "flex";
  } else {
    elements.storageTipBanner.style.display = "none";
  }
}

/**
 * Dismisses the browser storage tip banner and remembers the dismissal.
 */
function dismissStorageTip() {
  if (!elements.storageTipBanner) return;

  try {
    localStorage.setItem(STORAGE_KEYS.BACKUP_TIP_DISMISSED, "true");
  } catch (e) {
    console.warn("Storage write failed for backup tip:", e);
  }

  elements.storageTipBanner.style.display = "none";
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

  // Topbar Backup Dropdown & Actions
  setupBackupDropdown();

  if (elements.dismissStorageTipBtn) {
    elements.dismissStorageTipBtn.addEventListener("click", dismissStorageTip);
  }

  if (elements.exportTasksBtn) {
    elements.exportTasksBtn.addEventListener("click", exportTasks);
  }

  if (elements.importTasksBtn && elements.importFileInput) {
    elements.importTasksBtn.addEventListener("click", () => {
      elements.importFileInput.click();
    });

    elements.importFileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      // Reset input value immediately so user can pick the exact same file again
      e.target.value = "";
      if (file) {
        handleImportFile(file);
      }
    });
  }

  // Import Modal Action Buttons
  if (elements.cancelImportBtn) {
    elements.cancelImportBtn.addEventListener("click", closeImportModal);
  }
  if (elements.mergeImportBtn) {
    elements.mergeImportBtn.addEventListener("click", applyImportMerge);
  }
  if (elements.replaceImportBtn) {
    elements.replaceImportBtn.addEventListener("click", applyImportReplace);
  }
  if (elements.importModal) {
    elements.importModal.addEventListener("click", (e) => {
      if (e.target === elements.importModal) {
        closeImportModal();
      }
    });
  }

  // Add Task Form Submission
  elements.taskForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = elements.taskTitleInput.value.trim();
    const description = elements.taskDescInput.value.trim();
    const dueDate = elements.taskDueDateInput.value;
    const category = elements.taskCategorySelect ? elements.taskCategorySelect.value : DEFAULT_CATEGORY;
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

    // Save and close (branch between update and add)
    if (state.editingTaskId) {
      updateTask(state.editingTaskId, {
        title,
        description,
        priority,
        dueDate,
        category,
        subtasks: [...modalSubtasks]
      });
    } else {
      addTask({
        title,
        description,
        priority,
        dueDate,
        category,
        subtasks: [...modalSubtasks]
      });
    }
    closeTaskModal();
  });

  // Modal Subtasks input (Enter key adds subtask without submitting the form)
  if (elements.subtaskInput) {
    elements.subtaskInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addSubtaskFromModal();
      }
    });
  }

  // Modal Add Subtask button
  if (elements.addSubtaskBtn) {
    elements.addSubtaskBtn.addEventListener("click", (e) => {
      e.preventDefault();
      addSubtaskFromModal();
    });
  }

  // Modal Subtasks list remove button delegation
  if (elements.modalSubtaskList) {
    elements.modalSubtaskList.addEventListener("click", (e) => {
      const removeBtn = e.target.closest('[data-action="remove-subtask"]');
      if (removeBtn) {
        e.preventDefault();
        const id = removeBtn.dataset.id;
        if (id) {
          removeSubtaskFromModal(id);
        }
      }
    });
  }

  // Input clear error styling on type
  elements.taskTitleInput.addEventListener("input", () => {
    if (elements.taskTitleInput.value.trim()) {
      elements.titleError.textContent = "";
      elements.taskTitleInput.classList.remove("input-error");
    }
  });

  elements.taskDueDateInput.addEventListener("input", () => {
    if (elements.taskDueDateInput.value) {
      elements.dateError.textContent = "";
      elements.taskDueDateInput.classList.remove("input-error");
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

  // Category Dropdown Select
  if (elements.categoryFilterSelect) {
    elements.categoryFilterSelect.addEventListener("change", (e) => {
      state.categoryFilter = e.target.value;
      render();
    });
  }

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
    state.categoryFilter = "all";
    state.priorityFilter = "all";
    state.searchQuery = "";
    elements.taskSearchInput.value = "";
    elements.clearSearchBtn.style.display = "none";
    if (elements.categoryFilterSelect) elements.categoryFilterSelect.value = "all";
    elements.priorityFilterSelect.value = "all";
    render();
  });

  // Task Selection Bar Buttons
  if (elements.selectAllShownBtn) {
    elements.selectAllShownBtn.addEventListener("click", selectAllShownTasks);
  }
  if (elements.saveSelectedBtn) {
    elements.saveSelectedBtn.addEventListener("click", saveSelectedTasks);
  }
  if (elements.cancelSelectionBtn) {
    elements.cancelSelectionBtn.addEventListener("click", exitSelectionMode);
  }

  // Task List Selection checkbox change
  elements.taskList.addEventListener("change", (e) => {
    if (!state.isSelectionMode) return;
    const checkbox = e.target.closest(".task-select-checkbox");
    if (checkbox) {
      const taskId = checkbox.dataset.id;
      if (taskId) {
        toggleTaskSelection(taskId, checkbox.checked);
      }
    }
  });

  // Task List Event Delegation (Clicking checkbox or delete button)
  elements.taskList.addEventListener("click", (e) => {
    // While in selection mode, disable card buttons and toggle selection
    if (state.isSelectionMode) {
      if (e.target.closest(".task-select-checkbox")) {
        return; // Handled by change event on checkbox
      }
      const card = e.target.closest(".task-card");
      if (card) {
        const taskId = card.dataset.id;
        if (taskId) {
          toggleTaskSelection(taskId);
        }
      }
      return;
    }

    // 0. Toggle subtask completion
    const subtaskToggle = e.target.closest('[data-action="toggle-subtask"]');
    if (subtaskToggle) {
      e.stopPropagation();
      const taskId = subtaskToggle.dataset.taskId;
      const subtaskId = subtaskToggle.dataset.subtaskId;
      if (taskId && subtaskId) {
        toggleSubtaskCompletion(taskId, subtaskId);
      }
      return;
    }

    // 1. Toggle completion button
    const toggleBtn = e.target.closest('[data-action="toggle"]');
    if (toggleBtn) {
      const taskId = toggleBtn.dataset.id;
      toggleTaskCompletion(taskId);
      return;
    }

    // 2. Edit button
    const editBtn = e.target.closest('[data-action="edit"]');
    if (editBtn) {
      const taskId = editBtn.dataset.id;
      openEditTaskModal(taskId);
      return;
    }

    // 3. Delete button
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

  // Global Keyboard Shortcuts (Escape priority order & Alt+N)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      // 1. Mobile sidebar
      if (elements.sidebar && elements.sidebar.classList.contains("open")) {
        e.preventDefault();
        closeMobileSidebar();
        return;
      }
      // 2. Add / Edit Task Modal
      if (elements.taskModal && elements.taskModal.open) {
        e.preventDefault();
        closeTaskModal();
        return;
      }
      // 3. Delete Confirmation Modal
      if (elements.deleteConfirmModal && elements.deleteConfirmModal.open) {
        e.preventDefault();
        closeDeleteModal();
        return;
      }
      // 4. Restore Tasks Modal
      if (elements.importModal && elements.importModal.open) {
        e.preventDefault();
        closeImportModal();
        return;
      }
      // 5. Backup Dropdown Menu
      if (isBackupMenuOpen()) {
        e.preventDefault();
        closeBackupMenu(true);
        return;
      }
      // 6. Selection Mode (only when nothing else is open)
      if (state.isSelectionMode) {
        e.preventDefault();
        exitSelectionMode();
        return;
      }
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
// 12. Supabase Authentication Handlers & Flow
// ============================================================================

/**
 * Switches the auth card between 'login' and 'signup' modes.
 */
function setAuthMode(mode) {
  state.authMode = mode;
  hideAuthAlerts();

  if (mode === "signup") {
    if (elements.authTitle) elements.authTitle.textContent = "Create your account";
    if (elements.authSubtitle) elements.authSubtitle.textContent = "Get started with your free TaskFlow account.";
    if (elements.authPassword) elements.authPassword.setAttribute("autocomplete", "new-password");
    if (elements.authSubmitBtnText) elements.authSubmitBtnText.textContent = "Create account";
    if (elements.authSwitchPrompt) elements.authSwitchPrompt.textContent = "Already have an account?";
    if (elements.authSwitchBtn) elements.authSwitchBtn.textContent = "Log in";
  } else {
    if (elements.authTitle) elements.authTitle.textContent = "Log in to TaskFlow";
    if (elements.authSubtitle) elements.authSubtitle.textContent = "Welcome back! Please enter your details.";
    if (elements.authPassword) elements.authPassword.setAttribute("autocomplete", "current-password");
    if (elements.authSubmitBtnText) elements.authSubmitBtnText.textContent = "Log in";
    if (elements.authSwitchPrompt) elements.authSwitchPrompt.textContent = "Don't have an account?";
    if (elements.authSwitchBtn) elements.authSwitchBtn.textContent = "Create account";
  }

  if (elements.authEmail) elements.authEmail.focus();
}

/**
 * Displays an alert message in the auth card.
 * Uses textContent to ensure all messages are safe from HTML injection.
 */
function showAuthAlert(type, message) {
  if (type === "danger") {
    if (elements.authAlertDanger) {
      elements.authAlertDanger.textContent = message;
      elements.authAlertDanger.style.display = "block";
    }
    if (elements.authAlertInfo) {
      elements.authAlertInfo.style.display = "none";
      elements.authAlertInfo.textContent = "";
    }
  } else {
    if (elements.authAlertInfo) {
      elements.authAlertInfo.textContent = message;
      elements.authAlertInfo.style.display = "block";
    }
    if (elements.authAlertDanger) {
      elements.authAlertDanger.style.display = "none";
      elements.authAlertDanger.textContent = "";
    }
  }
}

/**
 * Hides all auth card alert banners.
 */
function hideAuthAlerts() {
  if (elements.authAlertDanger) {
    elements.authAlertDanger.style.display = "none";
    elements.authAlertDanger.textContent = "";
  }
  if (elements.authAlertInfo) {
    elements.authAlertInfo.style.display = "none";
    elements.authAlertInfo.textContent = "";
  }
}

/**
 * Converts Supabase auth errors into friendly, plain-language messages.
 * No technical jargon (e.g. 400, schema, payload, token) is shown.
 */
function mapAuthError(err) {
  if (!err) return "Something went wrong. Please try again.";
  const msg = String(err.message || "").toLowerCase();
  const status = err.status || 0;

  // Network or reachability errors
  if (
    msg.includes("fetch") ||
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("abort") ||
    msg.includes("load failed")
  ) {
    return "Can't reach the server. Check your internet connection.";
  }

  // Rate limiting / Too many attempts (429)
  if (status === 429 || msg.includes("rate limit") || msg.includes("too many requests") || msg.includes("over_email_send_rate_limit")) {
    return "Too many attempts. Please wait a minute and try again.";
  }

  // Invalid credentials
  if (
    msg.includes("invalid login credentials") ||
    msg.includes("invalid credentials") ||
    msg.includes("invalid_grant")
  ) {
    return "Wrong email or password.";
  }

  // User already exists
  if (
    msg.includes("already registered") ||
    msg.includes("already in use") ||
    msg.includes("user already exists") ||
    msg.includes("user_already_exists")
  ) {
    return "That email already has an account. Try logging in.";
  }

  // Email format error
  if (msg.includes("invalid email") || msg.includes("valid email") || msg.includes("email address")) {
    return "Please enter a valid email.";
  }

  // Password length or complexity error
  if (msg.includes("password should be at least") || msg.includes("password is too short")) {
    return "Password must be at least 8 characters long.";
  }

  // General fallback
  return "Something went wrong. Please try again.";
}

/**
 * Handles submission of the login/create account form.
 */
async function handleAuthSubmit(e) {
  if (e) e.preventDefault();
  if (state.isAuthSubmitting) return;

  hideAuthAlerts();

  const email = elements.authEmail ? elements.authEmail.value.trim() : "";
  const password = elements.authPassword ? elements.authPassword.value : "";

  // 1. Email validation: basic pattern check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    showAuthAlert("danger", "Please enter a valid email.");
    if (elements.authEmail) elements.authEmail.focus();
    return;
  }

  // 2. Password validation: minimum 8 characters, checked before sending
  if (!password || password.length < 8) {
    showAuthAlert("danger", "Password must be at least 8 characters long.");
    if (elements.authPassword) elements.authPassword.focus();
    return;
  }

  if (!supabaseClient) {
    showAuthAlert("danger", "Can't reach the server. Check your internet connection.");
    return;
  }

  // Set loading state: disable button, show "Please wait..."
  state.isAuthSubmitting = true;
  if (elements.authSubmitBtn) elements.authSubmitBtn.disabled = true;
  if (elements.authSubmitBtnText) elements.authSubmitBtnText.textContent = "Please wait...";

  try {
    if (state.authMode === "login") {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        showAuthAlert("danger", mapAuthError(error));
        return;
      }

      if (data?.user) {
        handleAuthSuccess(data.user);
      }
    } else {
      // Create account mode
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
      });

      if (error) {
        showAuthAlert("danger", mapAuthError(error));
        return;
      }

      if (data?.session) {
        // Logged in immediately
        handleAuthSuccess(data.user);
      } else if (data?.user) {
        // Confirmation email required
        showAuthAlert("info", "Check your email to confirm your account.");
      } else {
        showAuthAlert("info", "Check your email to confirm your account.");
      }
    }
  } catch (err) {
    showAuthAlert("danger", mapAuthError(err));
  } finally {
    state.isAuthSubmitting = false;
    if (elements.authSubmitBtn) elements.authSubmitBtn.disabled = false;
    if (elements.authSubmitBtnText) {
      elements.authSubmitBtnText.textContent = state.authMode === "signup" ? "Create account" : "Log in";
    }
  }
}

/**
 * Handles successful authentication transition to dashboard.
 */
function handleAuthSuccess(user) {
  state.currentUser = user;

  // 1. Hide loading screen and auth screen
  if (elements.appLoadingScreen) elements.appLoadingScreen.style.display = "none";
  if (elements.authScreen) elements.authScreen.style.display = "none";

  // 2. Reveal dashboard container
  if (elements.appContainer) elements.appContainer.style.display = "flex";

  // 3. Render user email in topbar chip safely with textContent
  if (elements.userAccountBadge) elements.userAccountBadge.style.display = "flex";
  if (elements.userEmailText) {
    elements.userEmailText.textContent = user?.email || "";
  }

  // 4. Clear auth form password and alerts
  if (elements.authPassword) elements.authPassword.value = "";
  hideAuthAlerts();

  // 5. Load tasks from localStorage (tasks stay in localStorage for now)
  state.tasks = loadTasksFromStorage();

  // 6. Update current date
  updateDateDisplay();

  // 7. Setup dashboard event listeners (guaranteed to attach only once)
  setupEventListeners();

  // 8. Render dashboard and initialize storage tip
  render();
  initStorageTip();
}

/**
 * Logs the user out, resets UI states, closes open modals, and reveals the auth screen.
 */
async function handleLogOut() {
  // 1. Close any open modals
  closeTaskModal();
  closeDeleteModal();
  closeImportModal();

  // 2. Close Backup menu
  closeBackupMenu(false);

  // 3. Exit task selection mode
  exitSelectionMode();

  // 4. Close mobile sidebar
  closeMobileSidebar();

  // 5. Clear auth form fields
  if (elements.authEmail) elements.authEmail.value = "";
  if (elements.authPassword) elements.authPassword.value = "";
  hideAuthAlerts();

  // 6. Sign out via Supabase
  try {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
  } catch (err) {
    // Silently handle any signout network exceptions
  }

  state.currentUser = null;

  // 7. Hide dashboard, show auth screen
  if (elements.appContainer) elements.appContainer.style.display = "none";
  if (elements.userAccountBadge) elements.userAccountBadge.style.display = "none";
  if (elements.authScreen) elements.authScreen.style.display = "flex";

  setAuthMode("login");
  showToast("You have been logged out.", "info");
}

let isAuthListenersAttached = false;

/**
 * Wires authentication event listeners once at startup.
 */
function setupAuthEventListeners() {
  if (isAuthListenersAttached) return;
  isAuthListenersAttached = true;

  if (elements.authThemeToggleBtn) {
    elements.authThemeToggleBtn.addEventListener("click", toggleTheme);
  }

  if (elements.authForm) {
    elements.authForm.addEventListener("submit", handleAuthSubmit);
  }

  if (elements.authSwitchBtn) {
    elements.authSwitchBtn.addEventListener("click", () => {
      setAuthMode(state.authMode === "login" ? "signup" : "login");
    });
  }

  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", handleLogOut);
  }
}

// Expose helpers for testing and external integrations
window.mapAuthError = mapAuthError;
window.handleAuthSuccess = handleAuthSuccess;
window.handleLogOut = handleLogOut;
window.startSelectionMode = startSelectionMode;
window.closeTaskModal = closeTaskModal;
window.setAuthMode = setAuthMode;

// ============================================================================
// 13. Application Initialization
// ============================================================================
async function init() {
  // 1. Load and apply saved Theme
  const savedTheme = loadThemeFromStorage();
  setTheme(savedTheme);

  // 2. Wire auth event listeners (runs only once)
  setupAuthEventListeners();

  // 3. If Supabase client could not be loaded, show error state on auth screen
  if (!supabaseClient) {
    if (elements.appLoadingScreen) elements.appLoadingScreen.style.display = "none";
    if (elements.authScreen) elements.authScreen.style.display = "flex";
    showAuthAlert("danger", "Can't reach the server. Check your internet connection.");
    return;
  }

  // 4. Subscribe to Supabase auth state change events
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session?.user) {
      handleAuthSuccess(session.user);
    }
  });

  // 5. Check existing session (persists across page reloads via supabase-js)
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    // Hide initial loading screen
    if (elements.appLoadingScreen) elements.appLoadingScreen.style.display = "none";

    if (error) {
      if (elements.authScreen) elements.authScreen.style.display = "flex";
      showAuthAlert("danger", mapAuthError(error));
      return;
    }

    if (data?.session?.user) {
      handleAuthSuccess(data.session.user);
    } else {
      if (elements.authScreen) elements.authScreen.style.display = "flex";
      setAuthMode("login");
    }
  } catch (err) {
    if (elements.appLoadingScreen) elements.appLoadingScreen.style.display = "none";
    if (elements.authScreen) elements.authScreen.style.display = "flex";
    showAuthAlert("danger", mapAuthError(err));
  }
}

// Boot application when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
