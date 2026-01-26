import React from "react";
import Button from "./Button";

const FilterBar = ({ children, onClear, searchValue, onSearchChange, searchPlaceholder = "Search...", className = "" }) => {
  return (
    <div className={`bg-white border-b border-neutral-200 ${className}`}>
      <div className="px-8 py-4">
        <div className="space-y-4">
          {/* Search Bar */}
          {onSearchChange && (
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[20px]">search</span>
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all bg-white text-neutral-900 placeholder:text-neutral-400"
                />
              </div>
              {onClear && (
                <Button variant="ghost" size="md" icon="filter_alt_off" onClick={onClear}>
                  Clear
                </Button>
              )}
            </div>
          )}

          {/* Filter Controls */}
          {children && <div className="flex items-center gap-3 flex-wrap">{children}</div>}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
