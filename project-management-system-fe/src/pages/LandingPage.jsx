import React from "react";
import bgImage from "../assets/bg.png";

const LandingPage = () => {
  return (
    <div className="image-container">
      <img
        src={bgImage}
        alt="Project management illustration"
        className="image"
      />
    </div>
  );
};

export default LandingPage;
