import React from "react";
import "../../styles/components/Button.css";

const Button = ({ type = "button", variant = "primary", onClick, disabled, loading, children, size, block, className = "", ...props }) => {
  const buttonClasses = ["custom-btn", `custom-btn-${variant}`, size && `custom-btn-${size}`, block && "custom-btn-block", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={buttonClasses} {...props}>
      {loading ? "Loading..." : children}
    </button>
  );
};

export default Button;
