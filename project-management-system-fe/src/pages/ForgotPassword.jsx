import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Row, Col, Button, Form, Card } from "react-bootstrap";
import authService from "../services/AuthService.js";
import { toast } from "react-toastify";

import "../styles/ForgotPassword.css";

import logo from "../assets/logo.png";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [isSentRequest, setIsSentRequest] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [repeatPassword, setRepeatPassword] = React.useState("");

  const handleForgotPassword = (event) => {
    event.preventDefault();
    const formData = {
      email: email,
    };

    if (!formData.email) {
      toast.error("Please enter your email");
      return;
    }

    authService
      .forgotPassword(formData)
      .then((response) => {
        toast.success("Password reset email sent successfully");
        setIsSentRequest(true);
      })
      .catch((error) => {
        console.error("Forgot password failed:", error);
        toast.error(error.response?.data?.message || "Forgot password failed");
      });
  };

  const handleResetPassword = (event) => {
    event.preventDefault();
    const formData = {
      token: otp,
      newPassword: newPassword,
    };
    if (newPassword !== repeatPassword) {
      toast.error("Passwords do not match");
      return;
    }

    authService
      .resetPassword(formData)
      .then((response) => {
        toast.success("Password reset successfully");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      })
      .catch((error) => {
        console.error("Reset password failed:", error);
        toast.error(error.response?.data?.message || "Reset password failed");
      });
  };

  return (
    <div className="forgot-password-page">
      <Container>
        <Row className="justify-content-center">
          <Col lg={6} md={8} sm={10}>
            <Card className="forgot-password-card">
              <Card.Body className="forgot-password-card-body">
                <div className="text-center mb-4">
                  <img src={logo} alt="Logo" className="forgot-password-logo" />
                  <h2 className="forgot-password-title">{isSentRequest ? "New Password" : "Forgot Password"}</h2>
                  <p className="forgot-password-subtitle">
                    {isSentRequest ? "Check your email for the OTP to reset your password." : "Please enter your email to reset your password."}
                  </p>
                </div>

                {isSentRequest === false ? (
                  <Form onSubmit={handleForgotPassword}>
                    <Form.Group className="forgot-password-form-group">
                      <Form.Label className="forgot-password-label">
                        Email <span style={{ color: "#ef4444" }}>*</span>
                      </Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        required
                        className="forgot-password-form-control"
                      />
                    </Form.Group>

                    <div className="d-flex justify-content-end mb-4">
                      <Link to="/login" className="forgot-password-login-link">
                        Back to Login
                      </Link>
                    </div>

                    <Button type="submit" className="forgot-password-btn">
                      Send OTP
                    </Button>
                  </Form>
                ) : (
                  <Form onSubmit={handleResetPassword}>
                    <Form.Group className="forgot-password-form-group">
                      <Form.Label className="forgot-password-label">
                        OTP <span style={{ color: "#ef4444" }}>*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="OTP"
                        placeholder="Enter the OTP"
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="forgot-password-form-control"
                      />
                    </Form.Group>

                    <Form.Group className="forgot-password-form-group">
                      <Form.Label className="forgot-password-label">
                        New Password <span style={{ color: "#ef4444" }}>*</span>
                      </Form.Label>
                      <Form.Control
                        type="password"
                        name="newPassword"
                        placeholder="Enter your new password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="forgot-password-form-control"
                      />
                    </Form.Group>

                    <Form.Group className="forgot-password-form-group">
                      <Form.Label className="forgot-password-label">
                        Repeat Password <span style={{ color: "#ef4444" }}>*</span>
                      </Form.Label>
                      <Form.Control
                        type="password"
                        name="repeatPassword"
                        placeholder="Repeat your new password"
                        required
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                        className="forgot-password-form-control"
                      />
                    </Form.Group>

                    <Button type="submit" className="forgot-password-btn">
                      Reset Password
                    </Button>
                  </Form>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default ForgotPasswordPage;
