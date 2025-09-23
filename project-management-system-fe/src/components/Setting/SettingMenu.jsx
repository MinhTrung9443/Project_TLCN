import { useState } from "react";
import "../../styles/Setting/SettingMenu.css";

const SettingMenu = ({ MenuList, activeIndex = 0, onTabChange, onCreate }) => {
  const [currentIndex, setCurrentIndex] = useState(activeIndex);

  const handleTabClick = (index, item) => {
    setCurrentIndex(index);
    if (onTabChange) onTabChange(index, item);
    window.location.hash = `#${item.toLowerCase().replace(/\s+/g, "-")}`;
  };

  return (
    <nav className="setting-menu">
      <ul>
        {MenuList.map((item, index) => (
          <li
            key={index}
            className={index === currentIndex ? "active" : ""}
            onClick={() => handleTabClick(index, item)}
            style={{ transition: "background 0.25s, color 0.25s" }}
          >
            <span>{item}</span>
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
