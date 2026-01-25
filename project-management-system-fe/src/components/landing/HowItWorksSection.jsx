import React from "react";
import howItWorksImage from "../../assets/how-it-works.svg";

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900">Here's how it works...</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <h3 className="text-3xl font-bold text-purple-600 mb-4">1. Task Management Best Practices</h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              Seamlessly manage projects, tasks and collaborate with your team across multiple projects, multiple xCorp accounts in one place.
            </p>
          </div>
          <div>
            <img src={howItWorksImage} alt="Task Management Best Practices" className="w-full h-auto rounded-lg shadow-lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center lg:grid-flow-col-dense">
          <div className="lg:col-start-2">
            <h3 className="text-3xl font-bold text-purple-600 mb-4">2. Visualize task in board</h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              Make sure your teammates in project are on the same page with you. Real-time update on screen. Manage project backlog and project plan.
              You and your team will get and stay on top of their most important tasks first.
            </p>
          </div>
          <div className="lg:col-start-1">
            <img src={howItWorksImage} alt="Visualize Task in Board" className="w-full h-auto rounded-lg shadow-lg" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
