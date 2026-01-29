import React from "react";

const InputField = ({ label, id, type, name, value, onChange, placeholder, error, className = "", ...props }) => {
  const InputComponent = type === "textarea" ? "textarea" : "input";
  const { rows, ...restProps } = props;

  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-900 mb-2">
        {label}
      </label>
      <InputComponent
        id={id}
        type={type === "textarea" ? undefined : type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={type === "textarea" ? rows || 3 : undefined}
        className={`w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-neutral-50 text-neutral-900 placeholder-neutral-400 ${
          error ? "border-accent-500 focus:ring-accent-500 bg-accent-50" : ""
        } ${className}`}
        {...restProps}
      />
      {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
    </div>
  );
};

export default InputField;
