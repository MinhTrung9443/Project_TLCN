// src/components/landing/IntegrationsSection.jsx
import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { BsCheckCircleFill } from 'react-icons/bs';
// Import logo các đối tác
import slackLogo from '../../assets/slack.png'; // <-- Thay bằng ảnh của bạn
import jiraLogo from '../../assets/jira.png'; // <-- Thay bằng ảnh của bạn
import googleDriveLogo from '../../assets/drive.svg'; // <-- Thay bằng ảnh của bạn

const IntegrationsSection = () => {
  return (
    <section id="integrations" className="integrations-section">
      <Container>
        <Row className="align-items-center">
          <Col lg={6}>
            <h2 className="section-title fw-bold mb-4">INTEGRATIONS</h2>
            <p className="lead-text mb-4">
              Integrate Zentask directly into your existing infrastructure and easily transfer data to other systems.
            </p>
            <ul className="feature-list">
              <li><BsCheckCircleFill className="check-icon" /> Zentask makes it easy to streamline your workflow with Slack.</li>
              <li><BsCheckCircleFill className="check-icon" /> When you request leave in Zentask app, your request is immediately notified to Slack channels in real time.</li>
              <li><BsCheckCircleFill className="check-icon" /> Can submit a leave request from Slack by command line friendly.</li>
            </ul>
          </Col>
          <Col lg={6} className="text-center mt-5 mt-lg-0">
            <div className="integration-logos">
              <div className="integration-logo-card"><img src={slackLogo} alt="Slack" /></div>
              <div className="integration-logo-card"><img src={jiraLogo} alt="Jira" /></div>
              <div className="integration-logo-card"><img src={googleDriveLogo} alt="Google Drive" /></div>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default IntegrationsSection;