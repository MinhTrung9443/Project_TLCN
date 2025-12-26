// src/components/landing/HeroSection.jsx
import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { BsCheck } from 'react-icons/bs'; 
import illustration from '../../assets/task_management.svg'; 

const features = [
  "Agile project management, Scrum project management and Kanban project management",
  "Keep tasks in task backlog, organize tasks in Scrum Sprint board or Kanban board, easily check gantt and critical path",
  "Prioritize backlog tasks, manage timesheet more effectively",
  "Manage task workflow",
  "Integrate with OKR system for better KPI monitoring",
  "Track team member's worklog and storypoint.",
];

const HeroSection = () => {
  return (
    <section id="home" className="hero-section">
      <div className="hero-bg-shape"></div>

      <Container>
        <Row className="align-items-center">
          <Col lg={6} md={12} className="hero-text">
            <h1 className="title">Task Management</h1>
            <p className="lead-text">
              Zentask implements task management tool for speeding agile project, allows teams to plan backlog tasks & track sprint boards, releases, milestones, roadmaps, epics and resources.
            </p>
            
            <ul className="feature-list">
              {features.map((feature, index) => (
                <li key={index}>
                  <BsCheck className="check-icon" /> 
                  <span className="ms-2">{feature}</span>
                </li>
              ))}
            </ul>
          </Col>

          <Col lg={6} md={12} className="illustration-container mt-5 mt-lg-0">
            <img src={illustration} alt="Task Management Illustration" className="img-fluid hero-image" />
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default HeroSection;