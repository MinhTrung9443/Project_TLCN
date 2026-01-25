import React from "react";

const FormCard = ({ title, children, variant, className = "", ...props }) => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className={`bg-white rounded-xl shadow-lg border border-gray-200 max-w-[480px] w-full p-8 ${className}`} {...props}>
        {title && <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">{title}</h2>}
        <div>{children}</div>
      </div>
    </div>
  );
};

export default FormCard;
