// src/components/landing/HowItWorksSection.jsx - PHIÊN BẢN SỬA LỖI LAYOUT
import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import howItWorksImage from '../../assets/how-it-works.svg'; // <-- Nhớ chuẩn bị ảnh này

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="how-it-works-section">
      <Container>
        <div className="text-center mb-5">
          <h2 className="section-title fw-bold">Here's how it works...</h2>
        </div>
        
        {/* === Mục 1: Text bên trái, ảnh bên phải === */}
        <Row className="align-items-center mb-5 pb-4">
          <Col lg={5} md={6}>
            <div className="step-text">
              <h3 className="step-title">1. Task Management Best Practices</h3>
              <p className="step-description">
                Seamlessly manage projects, tasks and collaborate with your team across multiple projects, multiple xCorp accounts in one place.
              </p>
            </div>
          </Col>
          <Col lg={7} md={6}>
            <img src={howItWorksImage} alt="Task Management Best Practices" className="img-fluid rounded shadow-lg" />
          </Col>
        </Row>
        
        <Row className="align-items-center flex-lg-row-reverse"> 
          <Col lg={5} md={6}>
            <div className="step-text">
              <h3 className="step-title">2. Visualize task in board</h3>
              <p className="step-description">
                Make sure your teammates in project are on the same page with you. Real-time update on screen. Manage project backlog and project plan. You and your team will get and stay on top of their most important tasks first.
              </p>
            </div>
          </Col>
          <Col lg={7} md={6}>
             <img src={howItWorksImage} alt="Visualize Task in Board" className="img-fluid rounded shadow-lg" />
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default HowItWorksSection;