import React from "react";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <button onClick={() => navigate("/")} className="text-2xl font-bold text-blue-900 hover:text-blue-800">
              Zentask
            </button>
          </div>
          <div className="hidden md:block">
            <div className="ml-auto flex items-center">
              <button
                onClick={() => navigate("/login")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-full transition-colors duration-200"
              >
                Go to App
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
