import React from "react";
import { formatDate } from "./ganttUtils";

const GanttProjectBar = ({ project, barStyle }) => {
  // Kiểm tra xem startDate và endDate có tồn tại không
  const hasValidDates = project.startDate && project.endDate;

  if (!hasValidDates) {
    // Không hiển thị thanh timeline nếu thiếu ngày
    return (
      <div className="flex items-center border-b border-slate-100 hover:bg-slate-50 transition-colors">
        <div className="w-full h-14 flex items-center justify-center">{/* Không hiển thị bar */}</div>
      </div>
    );
  }

  // Determine status class
  const getStatusColor = () => {
    const status = project.status?.toLowerCase() || "";

    if (status === "completed") {
      return "bg-emerald-500";
    }
    if (status === "active") {
      return "bg-sky-500";
    }
    if (status === "paused") {
      return "bg-amber-500";
    }

    return "bg-sky-500"; // Default
  };

  const tooltip = `${formatDate(project.startDate)} - ${formatDate(project.endDate)}`;
  const statusColor = getStatusColor();

  return (
    <div className="border-b border-slate-100 hover:bg-slate-50 transition-colors h-14 relative flex items-center">
      <div
        className={`${statusColor} rounded-md px-2 py-1 text-xs font-semibold text-white shadow-sm hover:shadow-md transition-shadow absolute h-7`}
        style={barStyle}
        title={tooltip}
      >
        <span className="truncate">{project.key}</span>
      </div>
    </div>
  );
};

export default GanttProjectBar;
