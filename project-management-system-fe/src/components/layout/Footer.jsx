import "../../styles/layout/Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>
          &copy; {new Date().getFullYear()} Project Management System. All
          rights reserved.
        </p>
        <div>
          <a href="/contact">Contact Us</a> |{" "}
          <a href="/privacy">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
