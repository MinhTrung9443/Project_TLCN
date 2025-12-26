// src/components/landing/FeaturesSection.jsx - COMPONENT MỚI

import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { BsClockHistory, BsBarChartLine, BsPieChartFill, BsCheckLg } from 'react-icons/bs';

const featureCards = [
    {
        icon: <BsClockHistory size={30} />,
        title: "Keep task organized",
        items: ["Allows organizing, discussing and tracking all in one place.", "Allow everyone to keep track of what they are working on.", "Notice the deadline for each task."]
    },
    {
        icon: <BsBarChartLine size={30} />,
        title: "Track task performance",
        items: ["Track each member's current status by filtering by assignee.", "Flexible change for priority of tasks to match your plan.", "See what's due today, which task you need to work on next."]
    },
    {
        icon: <BsPieChartFill size={30} />,
        title: "Task visualization",
        items: ["Manage and view team progress with Gantt charts.", "Able to drag and drop to set task dependencies.", "Easily change due date as your plan."]
    }
];

const FeaturesSection = () => {
    return (
        <section id="features" className="features-section">
            <Container>
                <div className="text-center mb-5">
                    <h2 className="section-title">Help you prioritize tasks, manage time more effectively, never miss deadlines, all in one task management feature.</h2>
                </div>
                <Row>
                    {featureCards.map((card, index) => (
                        <Col md={6} lg={4} key={index} className="d-flex align-items-stretch mb-4">
                            <Card className="feature-card w-100">
                                <Card.Body>
                                    <div className="feature-icon">{card.icon}</div>
                                    <Card.Title as="h4" className="mt-3">{card.title}</Card.Title>
                                    <ul className="card-feature-list">
                                        {card.items.map((item, i) => (
                                            <li key={i}>
                                                <BsCheckLg className="check-icon-sm" /> <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Container>
        </section>
    );
};

export default FeaturesSection;