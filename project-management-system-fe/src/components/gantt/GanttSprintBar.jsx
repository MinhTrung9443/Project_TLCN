import React from "react";
import { formatDate } from "./ganttUtils";

const GanttSprintBar = ({ sprint, barStyle }) => {
  // Kiểm tra xem startDate và endDate có tồn tại không
  const hasValidDates = sprint.startDate && sprint.endDate;

  if (!hasValidDates) {
    // Không hiển thị thanh timeline nếu thiếu ngày
    return (
      <div className="flex items-center border-b border-slate-100 hover:bg-slate-50 transition-colors">
        <div className="w-full h-14 flex items-center justify-center">{/* Không hiển thị bar */}</div>
      </div>
    );
  }

  // Determine status color
  const getStatusColor = () => {
    const status = sprint.status?.toLowerCase() || "";
    const today = new Date();
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);

    if (status === "completed" || status === "done") {
      return "bg-emerald-500";
    }
    if (status === "active" || (startDate <= today && endDate >= today)) {
      return "bg-sky-500";
    }
    if (startDate > today) {
      return "bg-slate-400";
    }

    return "bg-sky-500"; // Default
  };

  const tooltip = `${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}`;
  const statusColor = getStatusColor();

  return (
    <div className="border-b border-slate-100 hover:bg-slate-50 transition-colors h-14 relative flex items-center">
      <div className={`${statusColor} rounded-md h-7 shadow-sm hover:shadow-md transition-shadow absolute`} style={barStyle} title={tooltip} />
    </div>
  );
};

export default GanttSprintBar;
