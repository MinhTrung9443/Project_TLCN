import React from "react";
import { FaFacebookF, FaLinkedinIn, FaTwitter, FaInstagram, FaPaperPlane } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-700 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-white">Zentask</h2>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-xs">
                Zentask helps teams move faster, stay aligned, and deliver better work together. The #1 project management tool for agile teams.
              </p>
              <div className="flex gap-4">
                <a
                  href="#!"
                  className="w-9 h-9 rounded-full bg-gray-800 bg-opacity-50 flex items-center justify-center text-white hover:bg-purple-600 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <FaFacebookF size={16} />
                </a>
                <a
                  href="#!"
                  className="w-9 h-9 rounded-full bg-gray-800 bg-opacity-50 flex items-center justify-center text-white hover:bg-purple-600 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <FaTwitter size={16} />
                </a>
                <a
                  href="#!"
                  className="w-9 h-9 rounded-full bg-gray-800 bg-opacity-50 flex items-center justify-center text-white hover:bg-purple-600 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <FaLinkedinIn size={16} />
                </a>
                <a
                  href="#!"
                  className="w-9 h-9 rounded-full bg-gray-800 bg-opacity-50 flex items-center justify-center text-white hover:bg-purple-600 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <FaInstagram size={16} />
                </a>
              </div>
            </div>

            <div>
              <h5 className="text-white font-semibold text-lg mb-6 tracking-wide">Product</h5>
              <ul className="space-y-3">
                <li>
                  <a href="#!" className="text-gray-400 hover:text-white text-sm transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#!" className="text-gray-400 hover:text-white text-sm transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#!" className="text-gray-400 hover:text-white text-sm transition-colors">
                    Integrations
                  </a>
                </li>
                <li>
                  <a href="#!" className="text-gray-400 hover:text-white text-sm transition-colors">
                    Enterprise
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h5 className="text-white font-semibold text-lg mb-6 tracking-wide">Company</h5>
              <ul className="space-y-3">
                <li>
                  <a href="#!" className="text-gray-400 hover:text-white text-sm transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#!" className="text-gray-400 hover:text-white text-sm transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#!" className="text-gray-400 hover:text-white text-sm transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#!" className="text-gray-400 hover:text-white text-sm transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h5 className="text-white font-semibold text-lg mb-6 tracking-wide">Subscribe</h5>
              <p className="text-gray-400 text-sm mb-4">Join our newsletter to stay up to date on features and releases.</p>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2 bg-gray-800 text-white placeholder-gray-500 text-sm rounded-l focus:outline-none focus:bg-gray-700"
                />
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-r transition-colors">
                  <FaPaperPlane size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="text-center md:text-left">
              <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} Zentask Inc. All rights reserved.</p>
            </div>
            <div className="flex justify-center md:justify-end gap-6">
              <a href="#!" className="text-gray-500 hover:text-white text-sm transition-colors">
                Privacy Policy
              </a>
              <a href="#!" className="text-gray-500 hover:text-white text-sm transition-colors">
                Terms of Service
              </a>
              <a href="#!" className="text-gray-500 hover:text-white text-sm transition-colors">
                Cookies Settings
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
