import React from "react";

const sizes = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

const LoadingSpinner = ({ size = "md", text, className = "" }) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={`${sizes[size]} border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin`} />
      {text && <p className="text-sm text-neutral-600 font-medium">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
