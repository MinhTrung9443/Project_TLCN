// src/components/landing/Footer.jsx
import React from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import { FaFacebookF, FaLinkedinIn, FaTwitter, FaInstagram, FaPaperPlane } from 'react-icons/fa';

const Footer = () => {
    return (
        <footer className="footer-section">
            <Container>
                <div className="footer-top">
                    <Row>
                        {/* Cột 1: Thông tin Brand */}
                        <Col lg={4} md={6} className="mb-4 mb-lg-0">
                            <div className="footer-brand mb-3">
                                {/* Đã đổi thành Zentask */}
                                <h2 className="text-white fw-bold">Zentask</h2> 
                            </div>
                            <p className="footer-desc">
                                {/* Đã sửa mô tả cho khớp với tên Brand */}
                                Zentask helps teams move faster, stay aligned, and deliver better work together. The #1 project management tool for agile teams.
                            </p>
                            <div className="footer-social">
                                <a href="#!" className="social-link"><FaFacebookF /></a>
                                <a href="#!" className="social-link"><FaTwitter /></a>
                                <a href="#!" className="social-link"><FaLinkedinIn /></a>
                                <a href="#!" className="social-link"><FaInstagram /></a>
                            </div>
                        </Col>

                        {/* Cột 2: Product Links */}
                        <Col lg={2} md={6} sm={6} className="mb-4 mb-lg-0">
                            <h5 className="footer-heading">Product</h5>
                            <ul className="footer-links">
                                <li><a href="#!">Features</a></li>
                                <li><a href="#!">Pricing</a></li>
                                <li><a href="#!">Integrations</a></li>
                                <li><a href="#!">Enterprise</a></li>
                            </ul>
                        </Col>

                        {/* Cột 3: Company Links */}
                        <Col lg={2} md={6} sm={6} className="mb-4 mb-lg-0">
                            <h5 className="footer-heading">Company</h5>
                            <ul className="footer-links">
                                <li><a href="#!">About Us</a></li>
                                <li><a href="#!">Careers</a></li>
                                <li><a href="#!">Blog</a></li>
                                <li><a href="#!">Contact</a></li>
                            </ul>
                        </Col>

                        {/* Cột 4: Newsletter */}
                        <Col lg={4} md={6}>
                            <h5 className="footer-heading">Subscribe</h5>
                            <p className="footer-desc">
                                Join our newsletter to stay up to date on features and releases.
                            </p>
                            <Form className="footer-subscribe">
                                <div className="d-flex">
                                    <Form.Control 
                                        type="email" 
                                        placeholder="Enter your email" 
                                        className="me-2 subscribe-input"
                                    />
                                    <Button variant="primary" className="subscribe-btn">
                                        <FaPaperPlane />
                                    </Button>
                                </div>
                            </Form>
                        </Col>
                    </Row>
                </div>

                <div className="footer-bottom">
                    <Row className="align-items-center">
                        <Col md={6} className="text-center text-md-start">
                            <p className="copyright-text">
                                {/* Đã sửa Copyright */}
                                &copy; {new Date().getFullYear()} Zentask Inc. All rights reserved.
                            </p>
                        </Col>
                        <Col md={6} className="text-center text-md-end">
                            <ul className="footer-legal-links">
                                <li><a href="#!">Privacy Policy</a></li>
                                <li><a href="#!">Terms of Service</a></li>
                                <li><a href="#!">Cookies Settings</a></li>
                            </ul>
                        </Col>
                    </Row>
                </div>
            </Container>
        </footer>
    );
};

export default Footer;