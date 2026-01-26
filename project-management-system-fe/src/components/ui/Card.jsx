import React from "react";

const Card = ({ children, className = "", header, footer, padding = true, hoverable = false, ...props }) => {
  return (
    <div
      className={`
        bg-white rounded-xl border border-neutral-200 shadow-sm
        ${hoverable ? "transition-shadow duration-200 hover:shadow-md" : ""}
        ${className}
      `}
      {...props}
    >
      {header && <div className="px-6 py-4 border-b border-neutral-200">{header}</div>}
      <div className={padding ? "p-6" : ""}>{children}</div>
      {footer && <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 rounded-b-xl">{footer}</div>}
    </div>
  );
};

export default Card;
