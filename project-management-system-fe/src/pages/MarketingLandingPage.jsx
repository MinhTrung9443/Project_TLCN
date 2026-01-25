import React from "react";
import Header from "../components/landing/Header";
import HeroSection from "../components/landing/HeroSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import HowItWorksSection from "../components/landing/HowItWorksSection";
import IntegrationsSection from "../components/landing/IntegrationsSection";
import Footer from "../components/landing/Footer";
import EncyclopediaSection from "../components/landing/EncyclopediaSection";

const MarketingLandingPage = () => {
  return (
    <div className="font-sans bg-light">
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
