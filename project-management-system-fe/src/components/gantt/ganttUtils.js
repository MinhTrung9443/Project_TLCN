// Generate timeline columns based on view (weeks, months, years)
export const generateTimelineColumns = (timeView, startDate, endDate) => {
  const columns = [];
  startDate = startDate ? new Date(startDate) : new Date("2021-02-01");
  endDate = endDate ? new Date(endDate) : new Date("2023-12-31");

  if (timeView === "weeks") {
    let current = new Date(startDate);
    let weekNum = 1;
    while (current <= endDate) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);

      columns.push({
        label: `W${weekNum}`,
        sublabel: `(${String(weekStart.getDate()).padStart(2, "0")} - ${String(weekEnd.getDate()).padStart(2, "0")})`,
        start: weekStart,
        end: weekEnd,
      });

      current.setDate(current.getDate() + 7);
      weekNum++;
    }
  } else if (timeView === "months") {
    let current = new Date(startDate);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    while (current <= endDate) {
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
      const yearEnd = new Date(currentYear, 11, 31);

      columns.push({
        label: currentYear.toString(),
        sublabel: "Year",
        start: yearStart,
        end: yearEnd,
      });

      currentYear++;
    }
  }

  return columns.slice(0, 200); // Limit for demo
};

// Calculate bar position and width based on dates
export const calculateBarPosition = (startDate, endDate, timelineColumns) => {
  if (!timelineColumns || timelineColumns.length === 0) {
    return { left: "0%", width: "0%" };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const timelineStart = new Date(timelineColumns[0]?.start);
  const timelineEnd = new Date(timelineColumns[timelineColumns.length - 1]?.end);

  const totalDays = (timelineEnd - timelineStart) / (1000 * 60 * 60 * 24);
  const startOffset = (start - timelineStart) / (1000 * 60 * 60 * 24);
  const duration = (end - start) / (1000 * 60 * 60 * 24);

  const leftPercent = (startOffset / totalDays) * 100;
  const widthPercent = (duration / totalDays) * 100;

  return { left: `${leftPercent}%`, width: `${widthPercent}%` };
};
