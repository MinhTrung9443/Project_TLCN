// src/components/landing/EncyclopediaSection.jsx
import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';

import scrumImg from '../../assets/scrum.svg'; 
import kanbanImg from '../../assets/kanban.svg';
import agileImg from '../../assets/agile.svg';

const EncyclopediaSection = () => {
  // State để lưu trữ tab đang được chọn (mặc định là 'agile')
  const [activeTab, setActiveTab] = useState('agile');

  // Dữ liệu nội dung cho từng tab
  const contentData = {
    agile: {
      title: "Agile project management",
      description: "Agile management, Agile project management, Agile task management is the application of the principles of Agile software development and Lean Management to various management processes, particularly product development and project management.",
      image: agileImg,
      color: "#4caf50" // Màu xanh lá
    },
    scrum: {
      title: "Scrum project management",
      description: "Scrum project management or scrum task management is an Agile project management methodology involving a small team led by a Scrum master, whose main job is to remove all obstacles to getting work done. Work is done in short cycles called sprints.",
      image: scrumImg,
      color: "#e91e63" // Màu hồng
    },
    kanban: {
      title: "Kanban project management",
      description: "Kanban project management is an Agile framework used to visualize and improve workflows, reduce waste and inefficiency, and increase team focus by limiting work in progress. First developed by Toyota engineer Taiichi Ohno in the 1940s.",
      image: kanbanImg,
      color: "#f44336" // Màu đỏ
    }
  };

  return (
    <section className="encyclopedia-section">
      <Container>
        {/* Phần tiêu đề chung */}
        <div className="text-center mb-5">
          <h2 className="section-title fw-bold" style={{ color: '#6f42c1' }}>Agile Encyclopedia</h2>
          <p className="lead-text mx-auto" style={{ maxWidth: '800px' }}>
            An encyclopedia is a reference work or compendium providing summaries of knowledge either general or special to a particular field or discipline.
          </p>
        </div>

        <Row className="align-items-center">
          {/* Cột Trái: Danh sách các từ khóa (Menu) */}
          <Col md={5} className="encyclopedia-menu">
             <div className="encyclopedia-word-cloud">
                <div 
                    className={`word-item kanban ${activeTab === 'kanban' ? 'active' : ''}`}
                    onMouseEnter={() => setActiveTab('kanban')}
                >
                    Kanban <br/><span>project management</span>
                </div>
                <div 
                    className={`word-item agile ${activeTab === 'agile' ? 'active' : ''}`}
                    onMouseEnter={() => setActiveTab('agile')}
                >
                    Agile <br/><span>project management</span>
                </div>
                <div className="word-item main-title">ENCYCLOPEDIA</div>
                <div 
                    className={`word-item scrum ${activeTab === 'scrum' ? 'active' : ''}`}
                    onMouseEnter={() => setActiveTab('scrum')}
                >
                    Scrum <br/><span>project management</span>
                </div>
             </div>
          </Col>

          {/* Cột Phải: Nội dung thay đổi theo tab */}
          <Col md={1} className="d-none d-md-block text-center">
              {/* Mũi tên chỉ sang phải */}
              <div className="arrow-indicator">➜</div>
          </Col>

          <Col md={6}>
            <div className="content-display fade-in-key" key={activeTab}> {/* Key giúp trigger animation khi đổi tab */}
                <div className="text-center mb-4">
                     {/* Ảnh minh họa xoay xoay */}
                    <img 
                        src={contentData[activeTab].image} 
                        alt={activeTab} 
                        className="img-fluid content-image" 
                        style={{ maxHeight: '150px' }}
                    />
                </div>
                <h3 style={{ color: contentData[activeTab].color, fontWeight: 'bold' }}>
                    {contentData[activeTab].title}
                </h3>
                <p className="content-desc">
                    {contentData[activeTab].description}
                </p>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default EncyclopediaSection;