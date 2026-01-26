import React from "react";

const variants = {
  primary: "bg-primary-100 text-primary-700 border-primary-200",
  success: "bg-success-100 text-success-700 border-success-200",
  warning: "bg-warning-100 text-warning-700 border-warning-200",
  danger: "bg-accent-100 text-accent-700 border-accent-200",
  neutral: "bg-neutral-100 text-neutral-700 border-neutral-200",
};

const sizes = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
  lg: "px-3 py-1.5 text-sm",
};

const Badge = ({ children, variant = "neutral", size = "md", icon, className = "", ...props }) => {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-md border
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {icon && <span className="material-symbols-outlined text-[16px]">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
