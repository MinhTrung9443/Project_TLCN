import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import NotificationBell from "../common/NotificationBell";
import { FaUser, FaSignOutAlt } from "react-icons/fa";
import zentaskLogo from "../../assets/zentask.jpg";

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
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
    <header className="bg-white border-b border-neutral-200 shadow-sm sticky top-0 z-50">
      <div className="flex justify-between items-center px-6 h-16 max-w-full">
        <h1 className="m-0">
          <Link
            to="/app/dashboard"
            className="flex items-center gap-2.5 no-underline text-neutral-900 text-xl font-bold hover:text-primary-600 transition-colors"
          >
            <img src={zentaskLogo} alt="Zentask Logo" className="h-10 w-auto" />
            <span>ZENTASK</span>
          </Link>
        </h1>

        <nav className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-6" ref={dropdownRef}>
              <NotificationBell />

              <div className="relative" onClick={() => setDropdownOpen(!dropdownOpen)}>
                <button className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer border-2 border-transparent hover:border-primary-200">
                  {getAvatarUrl() ? (
                    <img src={getAvatarUrl()} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-neutral-700">{getAvatarInitial(user.fullname)}</span>
                  )}
                </button>

                {dropdownOpen && user && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-neutral-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-neutral-100">
                      <div className="font-semibold text-neutral-900">{user.fullname}</div>
                      <div className="text-sm text-neutral-500">{user.email}</div>
                    </div>
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-3 transition-colors"
                      onClick={() => {
                        navigate("/app/my-profile");
                        setDropdownOpen(false);
                      }}
                    >
                      <FaUser className="text-primary-600" />
                      My Profile
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-3 transition-colors border-t border-neutral-100"
                      onClick={handleLogout}
                    >
                      <FaSignOutAlt className="text-red-600" />
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors no-underline"
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
