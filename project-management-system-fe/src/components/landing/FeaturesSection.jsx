import React from "react";
import { BsClockHistory, BsBarChartLine, BsPieChartFill, BsCheckLg } from "react-icons/bs";

const featureCards = [
  {
    icon: <BsClockHistory size={30} />,
    title: "Keep task organized",
    items: [
      "Allows organizing, discussing and tracking all in one place.",
      "Allow everyone to keep track of what they are working on.",
      "Notice the deadline for each task.",
    ],
  },
  {
    icon: <BsBarChartLine size={30} />,
    title: "Track task performance",
    items: [
      "Track each member's current status by filtering by assignee.",
      "Flexible change for priority of tasks to match your plan.",
      "See what's due today, which task you need to work on next.",
    ],
  },
  {
    icon: <BsPieChartFill size={30} />,
    title: "Task visualization",
    items: [
      "Manage and view team progress with Gantt charts.",
      "Able to drag and drop to set task dependencies.",
      "Easily change due date as your plan.",
    ],
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 bg-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 leading-tight">
            Help you prioritize tasks, manage time more effectively, never miss deadlines, all in one task management feature.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureCards.map((card, index) => (
            <div key={index} className="h-full">
              <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full">
                <div className="flex justify-center items-center w-16 h-16 rounded-full bg-purple-100 text-purple-600 mb-6 text-2xl">{card.icon}</div>
                <h4 className="text-xl font-semibold text-gray-900 mb-4">{card.title}</h4>
                <ul className="space-y-3">
                  {card.items.map((item, i) => (
                    <li key={i} className="flex items-start text-gray-600">
                      <BsCheckLg className="text-purple-600 mr-2 mt-1 flex-shrink-0 text-sm" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
