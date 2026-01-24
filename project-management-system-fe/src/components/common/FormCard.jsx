import React from "react";
import "../../styles/components/FormCard.css";

const FormCard = ({ title, children, variant, className = "", ...props }) => {
  const cardClasses = ["form-card", variant && `form-card-${variant}`, className].filter(Boolean).join(" ");

  return (
    <div className={`d-flex justify-content-center align-items-center min-vh-100`}>
      <div className={cardClasses} style={{ maxWidth: "480px", width: "100%" }} {...props}>
        {title && <h2 className="form-card-title text-center">{title}</h2>}
        <div className="form-card-body">{children}</div>
      </div>
    </div>
  );
};

export default FormCard;
