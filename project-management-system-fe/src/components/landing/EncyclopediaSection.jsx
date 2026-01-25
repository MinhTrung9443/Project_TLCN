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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
          <div className="lg:col-span-1">
            <div className="relative h-96 flex items-center justify-center">
              <div
                className={`absolute p-4 rounded-lg transition-all duration-300 cursor-pointer ${activeTab === "kanban" ? "bg-purple-200 scale-110" : "hover:bg-gray-100"}`}
                style={{ top: "0", right: "0" }}
                onMouseEnter={() => setActiveTab("kanban")}
              >
                <div className="text-center text-sm font-semibold text-gray-900">
                  Kanban <br />
                  <span className="text-xs text-gray-600">project management</span>
                </div>
              </div>
              <div
                className={`absolute p-4 rounded-lg transition-all duration-300 cursor-pointer ${activeTab === "agile" ? "bg-purple-200 scale-110" : "hover:bg-gray-100"}`}
                style={{ top: "50%", left: "50%", transform: activeTab === "agile" ? "translate(-50%, -50%) scale(1.1)" : "translate(-50%, -50%)" }}
                onMouseEnter={() => setActiveTab("agile")}
              >
                <div className="text-center text-sm font-semibold text-gray-900">
                  Agile <br />
                  <span className="text-xs text-gray-600">project management</span>
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-purple-600">
                ENCYCLOPEDIA
              </div>
              <div
                className={`absolute p-4 rounded-lg transition-all duration-300 cursor-pointer ${activeTab === "scrum" ? "bg-purple-200 scale-110" : "hover:bg-gray-100"}`}
                style={{ bottom: "0", left: "0" }}
                onMouseEnter={() => setActiveTab("scrum")}
              >
                <div className="text-center text-sm font-semibold text-gray-900">
                  Scrum <br />
                  <span className="text-xs text-gray-600">project management</span>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex justify-center items-center">
            <div className="text-3xl text-gray-400">➜</div>
          </div>

          <div className="lg:col-span-1">
            <div className="fade-in">
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
