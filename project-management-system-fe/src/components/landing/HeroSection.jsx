import React from "react";
import { BsCheck } from "react-icons/bs";
import illustration from "../../assets/task_management.svg";

const features = [
  "Agile project management, Scrum project management and Kanban project management",
  "Keep tasks in task backlog, organize tasks in Scrum Sprint board or Kanban board, easily check gantt and critical path",
  "Prioritize backlog tasks, manage timesheet more effectively",
  "Manage task workflow",
  "Integrate with OKR system for better KPI monitoring",
  "Track team member's worklog and storypoint.",
];

const HeroSection = () => {
  return (
    <section id="home" className="relative pt-40 pb-24 bg-cyan-100 overflow-hidden">
      <div className="absolute top-0 right-0 w-2/5 h-full bg-indigo-600 rounded-bl-full rounded-tl-3xl z-0"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="hero-text">
            <h1 className="text-5xl font-bold text-blue-900 leading-tight mb-6">Task Management</h1>
            <p className="text-lg text-slate-700 font-normal mb-8 leading-relaxed">
              Zentask implements task management tool for speeding agile project, allows teams to plan backlog tasks & track sprint boards, releases,
              milestones, roadmaps, epics and resources.
            </p>

            <ul className="space-y-4">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start text-lg text-slate-800">
                  <BsCheck className="text-indigo-600 text-xl mr-4 mt-1 flex-shrink-0 border-2 border-indigo-600 rounded p-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="illustration-container flex justify-center items-center mt-8 lg:mt-0">
            <img src={illustration} alt="Task Management Illustration" className="w-full h-auto drop-shadow-lg" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
