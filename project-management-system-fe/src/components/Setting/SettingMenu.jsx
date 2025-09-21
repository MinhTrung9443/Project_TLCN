import "../../styles/Setting/SettingMenu.css";

const SettingMenu = ({ MenuList, activeIndex = 0 }) => {
  return (
    <nav className="setting-menu">
      <ul>
        {MenuList.map((item, index) => (
          <li key={index} className={index === activeIndex ? "active" : ""}>
            <a href="#">{item}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SettingMenu;
