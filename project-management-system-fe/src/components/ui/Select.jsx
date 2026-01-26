import React from "react";

const Select = ({
  label,
  error,
  helperText,
  options = [],
  className = "",
  containerClassName = "",
  placeholder = "Select an option",
  children,
  ...props
}) => {
  const hasChildren = React.Children.count(children) > 0;

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>}
      <div className="relative">
        <select
          className={`
            w-full rounded-lg border transition-all duration-200
            px-4 py-2.5 pr-10
            ${
              error
                ? "border-accent-500 focus:border-accent-500 focus:ring-accent-500"
                : "border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
            }
            bg-white text-neutral-900
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed
            appearance-none cursor-pointer
            ${className}
          `}
          {...props}
        >
          {placeholder !== null && <option value="">{placeholder}</option>}
          {hasChildren
            ? children
            : options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
          <span className="material-symbols-outlined text-[20px]">expand_more</span>
        </div>
      </div>
      {error && <p className="mt-1.5 text-sm text-accent-600">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-sm text-neutral-500">{helperText}</p>}
    </div>
  );
};

export default Select;
