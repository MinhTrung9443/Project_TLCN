import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/Setting/SettingMenu.css";

const SettingMenu = ({
  activeIndex = 0,
  onTabChange,
  onCreate,
  btnCreateVal,
}) => {
  const [MenuList] = useState([
    "General",
    "Project Member",
    "TaskTypes",
    "Prioritys",
    "Platforms",
    "History",
  ]);
  const navigate = useNavigate();
  const location = useLocation();
  const [currentIndex, setCurrentIndex] = useState(activeIndex);

  useEffect(() => {
    const pathParts = location.pathname.split("/");
    const currentTab = pathParts[pathParts.length - 2].toLowerCase();
    const foundIndex = MenuList.findIndex(
      (item) => item.toLowerCase() === currentTab
    );
    if (foundIndex !== -1) setCurrentIndex(foundIndex);
  }, [location.pathname, MenuList]);

  const handleTabClick = (index, item) => {
    setCurrentIndex(index);
    if (onTabChange) onTabChange(index, item);

    const pathParts = location.pathname.split("/");
    pathParts[pathParts.length - 2] = item;
    const newPath = pathParts.join("/");
    navigate(newPath);
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
            {btnCreateVal || "Create New"}
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default SettingMenu;
