// src/pages/MarketingLandingPage.jsx
import React from 'react';
import Header from '../components/landing/Header';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import HowItWorksSection from '../components/landing/HowItWorksSection'; // <-- MỚI
import IntegrationsSection from '../components/landing/IntegrationsSection'; // <-- MỚI
import Footer from '../components/landing/Footer'; // <-- MỚI
import EncyclopediaSection from '../components/landing/EncyclopediaSection'; // <-- Import mới
import '../styles/pages/MarketingLandingPage.css'; 

const MarketingLandingPage = () => {
  return (
    <div className="landing-page">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <EncyclopediaSection /> 
        <IntegrationsSection />
      </main>
      <Footer />
    </div>
  );
};

export default MarketingLandingPage;