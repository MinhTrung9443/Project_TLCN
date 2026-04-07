import React from "react";

const Input = ({ label, error, helperText, icon, className = "", containerClassName = "", ...props }) => {
  return (
    <div className={`w-full ${containerClassName}`}>
      {label && <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
          </div>
        )}
        <input
          className={`
            w-full rounded-lg border transition-all duration-200
            ${icon ? "pl-10 pr-4" : "px-4"} py-2.5
            ${
              error
                ? "border-accent-500 focus:border-accent-500 focus:ring-accent-500"
                : "border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
            }
            bg-white text-neutral-900 placeholder:text-neutral-400
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-sm text-accent-600">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-sm text-neutral-500">{helperText}</p>}
    </div>
  );
};

export default Input;
