import "../../styles/Setting/SettingMenu.css";

const SettingMenu = ({ MenuList, activeIndex = 0, onCreate }) => {
  return (
    <nav className="setting-menu">
      <ul>
        {MenuList.map((item, index) => (
          <li key={index} className={index === activeIndex ? "active" : ""}>
            <a href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}>{item}</a>
          </li>
        ))}
        <li>
          <button className="setting-menu-create-btn" onClick={onCreate}>
            <span
              className="material-symbols-outlined"
              style={{ verticalAlign: "middle", marginRight: 4 }}
            >
              add
            </span>
            Create
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default SettingMenu;
