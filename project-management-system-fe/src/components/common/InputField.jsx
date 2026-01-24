import React from "react";
import "../../styles/components/InputField.css";

const InputField = ({ label, id, type, name, value, onChange, placeholder, error, className = "", ...props }) => {
  return (
    <div className="input-field-group">
      <label htmlFor={id} className="input-field-label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`input-field-control ${error ? "is-invalid" : ""} ${className}`}
        {...props}
      />
      {error && <div className="input-field-error">{error}</div>}
    </div>
  );
};

export default InputField;
