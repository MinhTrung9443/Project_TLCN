import React, { useState } from "react";
import scrumImg from "../../assets/scrum.svg";
import kanbanImg from "../../assets/kanban.svg";
import agileImg from "../../assets/agile.svg";

const EncyclopediaSection = () => {
  const [activeTab, setActiveTab] = useState("agile");

  const contentData = {
    agile: {
      title: "Agile project management",
      description:
        "Agile management, Agile project management, Agile task management is the application of the principles of Agile software development and Lean Management to various management processes, particularly product development and project management.",
      image: agileImg,
      color: "#4caf50",
    },
    scrum: {
      title: "Scrum project management",
      description:
        "Scrum project management or scrum task management is an Agile project management methodology involving a small team led by a Scrum master, whose main job is to remove all obstacles to getting work done. Work is done in short cycles called sprints.",
      image: scrumImg,
      color: "#e91e63",
    },
    kanban: {
      title: "Kanban project management",
      description:
        "Kanban project management is an Agile framework used to visualize and improve workflows, reduce waste and inefficiency, and increase team focus by limiting work in progress. First developed by Toyota engineer Taiichi Ohno in the 1940s.",
      image: kanbanImg,
      color: "#f44336",
    },
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-purple-600">Agile Encyclopedia</h2>
          <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto leading-relaxed">
            An encyclopedia is a reference work or compendium providing summaries of knowledge either general or special to a particular field or
            discipline.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4 items-center max-w-6xl mx-auto">
          <div className="lg:col-span-5 flex justify-end">
            <div className="flex items-center justify-center h-full min-h-[24rem]">
              <div className="flex items-center space-x-6 md:space-x-8">
                {/* Kanban */}
                <div 
                  className="relative w-8 h-48 flex items-center justify-center cursor-pointer"
                  onMouseEnter={() => setActiveTab("kanban")}
                >
                  <div className="absolute transform -rotate-90 whitespace-nowrap flex flex-col items-start">
                    <div className={`text-3xl font-bold transition-all duration-300 ${activeTab === 'kanban' ? 'scale-110 origin-left opacity-100' : 'opacity-50'}`} style={{ color: contentData.kanban.color }}>
                      Kanban
                    </div>
                    <div className="text-sm text-gray-400">project management</div>
                  </div>
                </div>

                {/* Stack */}
                <div className="flex flex-col space-y-4 md:space-y-6">
                  {/* Agile */}
                  <div 
                    className="flex flex-col items-start cursor-pointer"
                    onMouseEnter={() => setActiveTab("agile")}
                  >
                    <div className={`text-3xl font-bold transition-all duration-300 ${activeTab === 'agile' ? 'scale-110 origin-left opacity-100' : 'opacity-50'}`} style={{ color: contentData.agile.color }}>
                      Agile
                    </div>
                    <div className="text-sm text-gray-400">project management</div>
                  </div>

                  {/* ENCYCLOPEDIA */}
                  <div className="text-4xl font-extrabold text-gray-900 tracking-wider">
                    ENCYCLOPEDIA
                  </div>

                  {/* Scrum */}
                  <div 
                    className="flex flex-col items-start cursor-pointer"
                    onMouseEnter={() => setActiveTab("scrum")}
                  >
                    <div className={`text-3xl font-bold transition-all duration-300 ${activeTab === 'scrum' ? 'scale-110 origin-left opacity-100' : 'opacity-50'}`} style={{ color: contentData.scrum.color }}>
                      Scrum
                    </div>
                    <div className="text-sm text-gray-400">project management</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex lg:col-span-2 justify-center items-center">
            <div className="text-3xl text-gray-400">➜</div>
          </div>

          <div className="lg:col-span-5 flex justify-start">
            <div className="fade-in max-w-md w-full">
              <div className="text-center mb-6">
                <img src={contentData[activeTab].image} alt={activeTab} className="w-32 h-auto mx-auto" />
              </div>
              <h3 style={{ color: contentData[activeTab].color }} className="text-2xl font-bold mb-4">
                {contentData[activeTab].title}
              </h3>
              <p className="text-gray-600 leading-relaxed">{contentData[activeTab].description}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EncyclopediaSection;
