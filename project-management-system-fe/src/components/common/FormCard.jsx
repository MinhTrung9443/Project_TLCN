import React from "react";
import { Card, Container } from "react-bootstrap";

const FormCard = ({ title, children }) => {
  return (
    <Container
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "100vh" }}
    >
      <Card className="p-4 shadow" style={{ maxWidth: "400px", width: "100%" }}>
        <Card.Body>
          <h2 className="text-center mb-4">{title}</h2>
          {children}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default FormCard;
