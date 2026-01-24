import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Row, Col, Button, Form, Card } from "react-bootstrap";
import authService from "../services/AuthService.js";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";

import "../styles/Login.css";

import logo from "../assets/logo.png";

const LoginPage = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (event) => {
    event.preventDefault();
    const formData = {
      email: event.target.email.value,
      password: event.target.password.value,
    };

    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    authService
      .login(formData)
      .then((response) => {
        login(response.data.user, response.data.token);
        toast.success("Login successful");
        // Redirect admin to projects page instead of audit-log
        if (response.data.user.role === "admin") {
          navigate("/app/projects");
          return;
        }
        navigate("/app/dashboard");
      })
      .catch((error) => {
        console.error("Login failed:", error);
        toast.error(error.response?.data?.message || "Login failed");
      });
  };

  return (
    <div className="login-page">
      <Container>
        <Row className="justify-content-center">
          <Col lg={6} md={8} sm={10}>
            <Card className="login-card">
              <Card.Body className="login-card-body">
                <div className="text-center mb-4">
                  <img src={logo} alt="Logo" className="login-logo" />
                  <h2 className="login-title">Sign in</h2>
                  <p className="login-subtitle">Welcome back! Please enter your details.</p>
                </div>

                <Form onSubmit={handleLogin}>
                  <Form.Group className="login-form-group">
                    <Form.Label className="login-label">
                      Email <span style={{ color: "#ef4444" }}>*</span>
                    </Form.Label>
                    <Form.Control type="email" name="email" placeholder="your.email@example.com" required className="login-form-control" />
                  </Form.Group>

                  <Form.Group className="login-form-group">
                    <Form.Label className="login-label">
                      Password <span style={{ color: "#ef4444" }}>*</span>
                    </Form.Label>
                    <Form.Control type="password" name="password" placeholder="Enter password" required className="login-form-control" />
                  </Form.Group>

                  <div className="d-flex justify-content-end mb-4">
                    <Link to="/forgot-password" className="login-forgot-link">
                      Forgot your password?
                    </Link>
                  </div>

                  <Button type="submit" className="login-btn">
                    Sign in
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default LoginPage;
