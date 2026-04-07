import React from "react";
import Badge from "./Badge";

const PageHeader = ({ title, subtitle, badge, icon, actions, className = "" }) => {
  return (
    <div className={`bg-white border-b border-neutral-200 sticky top-0 z-20 ${className}`}>
      <div className="px-6 py-4"> 
        <div className="flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-4 overflow-hidden">
            
            {icon && (
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100">
                <span className="material-symbols-outlined text-primary-700 text-[24px]">
                  {icon}
                </span>
              </div>
            )}

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-neutral-900 tracking-tight truncate">
                  {title}
                </h1>
                
                {badge && (
                  <Badge variant="primary" size="sm" className="flex-shrink-0">
                    {badge}
                  </Badge>
                )}
              </div>
              
              {subtitle && (
                <p className="text-sm text-neutral-500 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {actions && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;