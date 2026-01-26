import React from "react";
import { formatDate } from "./ganttUtils";

const GanttTaskBar = ({ task, barStyle }) => {
  // Task có thể dùng dueDate thay vì endDate
  const endDate = task.dueDate || task.endDate;

  // Kiểm tra xem startDate và endDate có tồn tại không
  const hasValidDates = task.startDate && endDate;

  if (!hasValidDates) {
    // Không hiển thị thanh timeline nếu thiếu ngày
    return (
      <div className="flex items-center border-b border-slate-100 hover:bg-slate-50 transition-colors">
        <div className="w-full h-14 flex items-center justify-center">{/* Không hiển thị bar */}</div>
      </div>
    );
  }

  // Determine status color based on task status and dates
  const getStatusColor = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const statusCategory = (task.status?.category || task.statusId?.category || "").toString().toLowerCase();
    const dueDate = new Date(endDate);
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    // If task is marked done AND lastLogTime exists and lastLogTime <= dueDate => completed on time (green)
    if (statusCategory === "done") {
      if (task.lastLogTime) {
        const lastLog = new Date(task.lastLogTime);
        lastLog.setHours(0, 0, 0, 0);
        if (lastLog <= dueDate) return "bg-emerald-500"; // completed on time
      }
      // If done but no lastLog or lastLog after dueDate, fall through to check overdue
    }

    // Overdue (past due) -> red (regardless of done)
    if (dueDate < today) {
      return "bg-rose-500";
    }

    // Upcoming due (within 3 days) -> orange
    if (daysUntilDue >= 0 && daysUntilDue <= 3) {
      return "bg-amber-500";
    }

    // Default: use in-progress or not-started mapping
    if (statusCategory === "to do" || statusCategory === "todo") return "bg-slate-400";
    if (statusCategory === "in progress" || statusCategory === "in-progress") return "bg-sky-500";

    return "bg-sky-500";
  };

  const tooltip = `${formatDate(task.startDate)} - ${formatDate(endDate)}`;
  const statusColor = getStatusColor();

  return (
    <div className="border-b border-slate-100 hover:bg-slate-50 transition-colors h-14 relative flex items-center">
      <div
        className={`${statusColor} rounded-md px-2 py-1 text-xs font-semibold text-white shadow-sm hover:shadow-md transition-shadow overflow-hidden absolute h-7 flex items-center`}
        style={barStyle}
        title={tooltip}
      >
        <span className="truncate">{task.name}</span>
      </div>
    </div>
  );
};

export default GanttTaskBar;
