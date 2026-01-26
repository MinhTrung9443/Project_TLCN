const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-neutral-50 via-neutral-100 to-neutral-50 text-neutral-600 py-8 border-t border-neutral-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm font-medium text-neutral-700">&copy; {new Date().getFullYear()} Zentask. All rights reserved.</p>
          <div className="text-sm space-x-4">
            <a href="/contact" className="text-neutral-600 hover:text-primary-600 transition-colors duration-200 font-medium">
              Contact Us
            </a>
            <span className="text-neutral-300">|</span>
            <a href="/privacy" className="text-neutral-600 hover:text-primary-600 transition-colors duration-200 font-medium">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
