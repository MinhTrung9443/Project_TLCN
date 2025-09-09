import React from 'react';
import { Button as BootstrapButton } from 'react-bootstrap';

const Button = ({ type, variant, onClick, disabled, loading, children }) => {
  return (
    <BootstrapButton
      type={type}
      variant={variant}
      onClick={onClick}
      disabled={disabled || loading}
      className="w-100"
    >
      {loading ? 'Loading...' : children}
    </BootstrapButton>
  );
};

export default Button;