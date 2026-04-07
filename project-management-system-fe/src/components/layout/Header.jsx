import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import NotificationBell from "../common/NotificationBell";
import { FaUser, FaSignOutAlt } from "react-icons/fa";
import { useChat } from "../../contexts/ChatContext"; 
import { BsChatDots } from "react-icons/bs";
import zentaskLogo from "../../assets/zentask.jpg";

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { openChat, isChatOpen } = useChat(); // Lấy hàm mở chat

  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate("/login");
  };

  function getAvatarInitial(name) {
    if (typeof name === "string" && name.length > 0) {
      return name.charAt(0).toUpperCase();
    }
    return "?";
  }

  const getAvatarUrl = () => {
    if (user && user.avatar) {
      return user.avatar;
    }
    return null;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <header className="bg-white border-b border-neutral-200/50 shadow-sm sticky top-0 z-50 backdrop-blur-sm">
      <div className="flex justify-between items-center px-6 h-16 max-w-full">
        {/* Logo Section */}
        <h1 className="m-0">
          <Link to="/app/dashboard" className="flex items-center gap-3 no-underline group">
            <div className="relative">
              <img src={zentaskLogo} alt="Zentask Logo" className="h-10 w-auto rounded-lg shadow-sm group-hover:shadow-md transition-shadow" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-lg font-bold bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent group-hover:from-primary-700 group-hover:to-blue-700 transition-all">
                ZENTASK
              </span>
              <span className="text-xs text-neutral-500 -mt-1">Project Management</span>
            </div>
          </Link>
        </h1>

        {/* Navigation */}
        <nav className="flex items-center gap-6">
          {isAuthenticated ? (
            <div className="flex items-center gap-6" ref={dropdownRef}>
                 {/* CHAT ICON BUTTON */}
            <button 
                onClick={openChat}
                className={`relative p-2 rounded-full transition-all ${isChatOpen ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                title="Messages"
            >
                <BsChatDots className="text-xl" />
                {/* Badge (Hardcode demo) */}
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
            </button>
              {/* Notification Bell */}
              <div className="flex items-center">
                <NotificationBell />
              </div>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-blue-100 hover:from-primary-200 hover:to-blue-200 transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-primary-300 shadow-sm"
                  title="User menu"
                >
                  {getAvatarUrl() ? (
                    <img src={getAvatarUrl()} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
                      {getAvatarInitial(user.fullname)}
                    </span>
                  )}
                </button>

                {dropdownOpen && user && (
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden z-50">
                    {/* User Info Section */}
                    <div className="px-4 py-3 bg-gradient-to-r from-primary-50 to-blue-50 border-b border-neutral-100">
                      <div className="flex items-center gap-3 mb-2">
                        {getAvatarUrl() ? (
                          <img src={getAvatarUrl()} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {getAvatarInitial(user.fullname)}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-neutral-900 text-sm">{user.fullname}</div>
                          <div className="text-xs text-neutral-600">{user.email}</div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button
                        className="w-full text-left px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-3 transition-colors group"
                        onClick={() => {
                          navigate("/app/my-profile");
                          setDropdownOpen(false);
                        }}
                      >
                        <FaUser className="text-primary-600 group-hover:scale-110 transition-transform" size={14} />
                        <span className="font-medium">My Profile</span>
                      </button>
                      <button
                        className="w-full text-left px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-3 transition-colors group border-t border-neutral-100"
                        onClick={handleLogout}
                      >
                        <FaSignOutAlt className="text-red-500 group-hover:scale-110 transition-transform" size={14} />
                        <span className="font-medium">Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700 rounded-lg transition-all duration-200 no-underline shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
            >
              LOGIN
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
