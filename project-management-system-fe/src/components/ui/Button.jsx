import React from "react";

const variants = {
  primary: "bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow-md active:bg-primary-800",
  secondary: "bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 shadow-sm hover:shadow",
  ghost: "hover:bg-neutral-100 text-neutral-700",
  danger: "bg-accent-600 hover:bg-accent-700 text-white shadow-sm hover:shadow-md",
  success: "bg-success-600 hover:bg-success-700 text-white shadow-sm hover:shadow-md",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

const Button = ({ children, variant = "primary", size = "md", className = "", disabled = false, icon, iconPosition = "left", ...props }) => {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled} {...props}>
      {icon && iconPosition === "left" && <span className="material-symbols-outlined text-[20px]">{icon}</span>}
      {children}
      {icon && iconPosition === "right" && <span className="material-symbols-outlined text-[20px]">{icon}</span>}
    </button>
  );
};

export default Button;
