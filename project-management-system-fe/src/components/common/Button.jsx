import React from "react";

const Button = ({ type = "button", variant = "primary", onClick, disabled, loading, children, size = "md", block, className = "", ...props }) => {
  const baseClasses = "font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2";

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const variantClasses = {
    primary: "bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-400",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-900 disabled:bg-gray-400",
    danger: "bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-400",
    outline: "border-2 border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50",
  };

  const buttonClasses = [
    baseClasses,
    sizeClasses[size] || sizeClasses.md,
    variantClasses[variant] || variantClasses.primary,
    block && "w-full",
    (disabled || loading) && "cursor-not-allowed opacity-60",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={buttonClasses} {...props}>
      {loading ? "Loading..." : children}
    </button>
  );
};

export default Button;
