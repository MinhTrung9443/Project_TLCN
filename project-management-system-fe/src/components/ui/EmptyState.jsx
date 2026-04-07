import React from "react";
import Button from "./Button";

const EmptyState = ({ icon = "inbox", title = "No data found", description, action, className = "" }) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
        <span className="material-symbols-outlined text-neutral-400 text-[32px]">{icon}</span>
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-neutral-600 text-center max-w-sm mb-6">{description}</p>}
      {action && action}
    </div>
  );
};

export default EmptyState;
