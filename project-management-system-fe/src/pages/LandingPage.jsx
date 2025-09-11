
import React from 'react';
import bgImage from '../assets/bg.png';

const LandingPage = () => {
  return (
    <div className="hero-image-container">
      <img src={bgImage} alt="Project management illustration" className="hero-image" />
    </div>
  );
};

export default LandingPage;