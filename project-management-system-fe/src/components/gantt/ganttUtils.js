// Format date for display (DD/MM/YYYY)
export const formatDate = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

// Calculate earliest start date and latest end date from gantt data
export const calculateDateRange = (items, backlogTasks = [], timeView = "weeks") => {
  if (!Array.isArray(items) || items.length === 0) {
    // Check if backlogTasks has data
    if (Array.isArray(backlogTasks) && backlogTasks.length > 0) {
      items = backlogTasks;
    } else {
      return {
        startDate: new Date("2025-02-01"),
        endDate: new Date("2025-12-31"),
      };
    }
  }

  let minDate = null;
  let maxDate = null;

  const updateDates = (startDate, endDate) => {
    if (startDate) {
      const start = new Date(startDate);
      if (!minDate || start < minDate) {
        minDate = start;
      }
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!maxDate || end > maxDate) {
        maxDate = end;
      }
    }
  };

  // Iterate through items (could be projects, sprints, or tasks)
  items.forEach((item) => {
    // Item could be a project
    if (item.sprints || item.backlogTasks || item.tasks) {
      const project = item;
      updateDates(project.startDate, project.endDate);

      // Check sprints if exists
      if (project.sprints && Array.isArray(project.sprints)) {
        project.sprints.forEach((sprint) => {
          updateDates(sprint.startDate, sprint.endDate);

          // Check tasks in sprint if exists
          if (sprint.tasks && Array.isArray(sprint.tasks)) {
            sprint.tasks.forEach((task) => {
              updateDates(task.startDate, task.dueDate);
            });
          }
        });
      }

      // Check backlog tasks if exists
      if (project.backlogTasks && Array.isArray(project.backlogTasks)) {
        project.backlogTasks.forEach((task) => {
          updateDates(task.startDate, task.dueDate);
        });
      }

      // Check tasks if exists (for project-task groupby)
      if (project.tasks && Array.isArray(project.tasks)) {
        project.tasks.forEach((task) => {
          updateDates(task.startDate, task.dueDate);
        });
      }
    }
    // Item could be a sprint
    else if (item.tasks && item.projectId) {
      const sprint = item;
      updateDates(sprint.startDate, sprint.endDate);

      // Check tasks in sprint if exists
      if (sprint.tasks && Array.isArray(sprint.tasks)) {
        sprint.tasks.forEach((task) => {
          updateDates(task.startDate, task.dueDate);
        });
      }
    }
    // Item could be a task
    else {
      const task = item;
      updateDates(task.startDate, task.dueDate);
    }
  });

  // Process backlogTasks separately
  if (Array.isArray(backlogTasks) && backlogTasks.length > 0) {
    backlogTasks.forEach((task) => {
      updateDates(task.startDate, task.dueDate);
    });
  }

  // If no valid dates found, use defaults
  if (!minDate) minDate = new Date("2025-02-01");
  if (!maxDate) maxDate = new Date("2025-12-31");

  // Add padding based on time view
  const paddingStart = new Date(minDate);
  const paddingEnd = new Date(maxDate);

  if (timeView === "weeks") {
    paddingStart.setDate(paddingStart.getDate() - 21); // 3 weeks before
    paddingEnd.setDate(paddingEnd.getDate() + 21); // 3 weeks after
  } else if (timeView === "months") {
    paddingStart.setMonth(paddingStart.getMonth() - 1); // 1 month before
    paddingEnd.setMonth(paddingEnd.getMonth() + 1); // 1 month after
  } else if (timeView === "years") {
    paddingStart.setFullYear(paddingStart.getFullYear() - 1); // 1 year before
    paddingEnd.setFullYear(paddingEnd.getFullYear() + 1); // 1 year after
  }

  return {
    startDate: paddingStart,
    endDate: paddingEnd,
  };
};

// Generate timeline columns based on view (weeks, months, years)
export const generateTimelineColumns = (timeView, startDate, endDate) => {
  const columns = [];
  startDate = startDate ? new Date(startDate) : new Date("2025-02-01");
  endDate = endDate ? new Date(endDate) : new Date("2025-12-31");

  if (timeView === "weeks") {
    let current = new Date(startDate);
    // Start from Monday of the week
    const dayOfWeek = current.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, else go to Monday
    current.setDate(current.getDate() + diff);

    let weekNum = 1;
    while (current <= endDate) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

      columns.push({
        label: `W${weekNum}`,
        sublabel: `(${String(weekStart.getDate()).padStart(2, "0")}/${String(weekStart.getMonth() + 1).padStart(2, "0")} - ${String(
          weekEnd.getDate()
        ).padStart(2, "0")}/${String(weekEnd.getMonth() + 1).padStart(2, "0")})`,
        start: weekStart,
        end: weekEnd,
      });

      current.setDate(current.getDate() + 7);
      weekNum++;
    }
  } else if (timeView === "months") {
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    while (current <= end) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);

      columns.push({
        label: monthNames[current.getMonth()],
        sublabel: current.getFullYear().toString(),
        start: monthStart,
        end: monthEnd,
      });

      // Move to next month
      current.setMonth(current.getMonth() + 1);
    }
  } else if (timeView === "years") {
    let currentYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    while (currentYear <= endYear) {
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

      columns.push({
        label: currentYear.toString(),
        sublabel: "Year",
        start: yearStart,
        end: yearEnd,
      });

      currentYear++;
    }
  }

  return columns;
};

// Calculate bar position and width based on dates
export const calculateBarPosition = (startDate, endDate, timelineColumns) => {
  if (!timelineColumns || timelineColumns.length === 0) {
    return { left: "0%", width: "0%" };
  }

  if (!startDate || !endDate) {
    return { left: "0%", width: "0%" };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Set to start/end of day for accurate calculation
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const columnCount = timelineColumns.length;
  const columnWidthPercent = 100 / columnCount; // Each column gets equal percentage

  // Find which columns the bar spans
  let startColumnIndex = -1;
  let endColumnIndex = -1;
  let startOffsetInColumn = 0;
  let endOffsetInColumn = 0;

  // Find start column and offset
  for (let i = 0; i < timelineColumns.length; i++) {
    const colStart = new Date(timelineColumns[i].start);
    const colEnd = new Date(timelineColumns[i].end);
    colStart.setHours(0, 0, 0, 0);
    colEnd.setHours(23, 59, 59, 999);

    if (start >= colStart && start <= colEnd) {
      startColumnIndex = i;
      const columnDuration = colEnd - colStart + 1;
      const offsetFromStart = start - colStart;
      startOffsetInColumn = (offsetFromStart / columnDuration) * columnWidthPercent;
      break;
    } else if (start < colStart && startColumnIndex === -1) {
      // Start date is before this column, use this column
      startColumnIndex = i;
      startOffsetInColumn = 0;
      break;
    }
  }

  // Find end column and offset
  for (let i = 0; i < timelineColumns.length; i++) {
    const colStart = new Date(timelineColumns[i].start);
    const colEnd = new Date(timelineColumns[i].end);
    colStart.setHours(0, 0, 0, 0);
    colEnd.setHours(23, 59, 59, 999);

    if (end >= colStart && end <= colEnd) {
      endColumnIndex = i;
      const columnDuration = colEnd - colStart + 1;
      const offsetFromStart = end - colStart;
      endOffsetInColumn = (offsetFromStart / columnDuration) * columnWidthPercent;
      break;
    } else if (end > colEnd) {
      // End date is after this column, might be in next column
      endColumnIndex = i;
      endOffsetInColumn = columnWidthPercent;
    }
  }

  // Fallback if not found
  if (startColumnIndex === -1) startColumnIndex = 0;
  if (endColumnIndex === -1) endColumnIndex = columnCount - 1;

  // Calculate final position
  const leftPercent = startColumnIndex * columnWidthPercent + startOffsetInColumn;
  const rightPercent = endColumnIndex * columnWidthPercent + endOffsetInColumn;
  let widthPercent = rightPercent - leftPercent;

  // Ensure minimum width for visibility
  if (widthPercent < 0.5) {
    widthPercent = 0.5;
  }

  // Clamp values
  const finalLeft = Math.max(0, Math.min(leftPercent, 100));
  const finalWidth = Math.min(widthPercent, 100 - finalLeft);

  return {
    left: `${finalLeft}%`,
    width: `${finalWidth}%`,
  };
};
