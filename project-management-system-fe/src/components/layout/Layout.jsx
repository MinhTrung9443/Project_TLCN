import React from "react";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import bgImage from '../../assets/bg.png';

const Layout = ({ children }) => {
  return (
   <> 
      <Header /> 

      <div className="hero-image-container">
        <img src={bgImage} alt="Project management illustration" className="hero-image" />
      </div>

      <main className="main-content">
        {children}
      </main>
      <Footer />
    </>
  );
};

export default Layout;