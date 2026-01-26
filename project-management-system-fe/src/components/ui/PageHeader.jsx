import React from "react";
import Badge from "./Badge";

const PageHeader = ({ title, subtitle, badge, icon, actions, className = "" }) => {
  return (
    <div className={`bg-white border-b border-neutral-200 ${className}`}>
      <div className="px-8 py-6">
        <div className="flex items-center justify-between gap-6">
          <div className="flex flex-col gap-3 min-w-0 flex-1">
            {/* Badge & Icon Row */}
            {(badge || icon) && (
              <div className="flex items-center gap-2">
                {icon && (
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100">
                    <span className="material-symbols-outlined text-primary-700 text-[24px]">{icon}</span>
                  </div>
                )}
                {badge && (
                  <Badge variant="primary" size="sm">
                    {badge}
                  </Badge>
                )}
              </div>
            )}

            {/* Title & Subtitle */}
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>}
            </div>
          </div>

          {/* Actions */}
          {actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
