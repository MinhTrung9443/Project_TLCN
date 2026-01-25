import React from "react";
import { BsCheckCircleFill } from "react-icons/bs";
import slackLogo from "../../assets/slack.png";
import jiraLogo from "../../assets/jira.png";
import googleDriveLogo from "../../assets/drive.svg";

const IntegrationsSection = () => {
  return (
    <section id="integrations" className="py-20 bg-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">INTEGRATIONS</h2>
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              Integrate Zentask directly into your existing infrastructure and easily transfer data to other systems.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start text-lg text-gray-800">
                <BsCheckCircleFill className="text-indigo-600 mr-4 mt-1 flex-shrink-0" />
                <span>Zentask makes it easy to streamline your workflow with Slack.</span>
              </li>
              <li className="flex items-start text-lg text-gray-800">
                <BsCheckCircleFill className="text-indigo-600 mr-4 mt-1 flex-shrink-0" />
                <span>When you request leave in Zentask app, your request is immediately notified to Slack channels in real time.</span>
              </li>
              <li className="flex items-start text-lg text-gray-800">
                <BsCheckCircleFill className="text-indigo-600 mr-4 mt-1 flex-shrink-0" />
                <span>Can submit a leave request from Slack by command line friendly.</span>
              </li>
            </ul>
          </div>
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="grid grid-cols-3 gap-6 w-full">
              <div className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center justify-center">
                <img src={slackLogo} alt="Slack" className="max-h-20 w-auto" />
              </div>
              <div className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center justify-center">
                <img src={jiraLogo} alt="Jira" className="max-h-20 w-auto" />
              </div>
              <div className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center justify-center">
                <img src={googleDriveLogo} alt="Google Drive" className="max-h-20 w-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IntegrationsSection;
