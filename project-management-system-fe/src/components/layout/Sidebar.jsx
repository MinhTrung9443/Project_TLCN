import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import '../../styles/layout/Sidebar.css';

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: 'icon-dashboard' },
  {
    name: 'Task Management',
    icon: 'icon-task',
    subItems: [
      { name: 'Projects', path: '/task-management/projects' },
      { name: 'Task Finder', path: '/task-management/task-finder' },
      { name: 'Gantt', path: '/task-management/gantt' },
      { name: 'Project Settings', path: '/task-management/projectssetting' },
    ],
  },
  {
    name: 'Work Tracking',
    icon: 'icon-work',
    subItems: [
        { name: 'Work Logs', path: '/work-tracking/logs'},
    ]
  },

];

const Sidebar = () => {
    const [openMenus, setOpenMenus] = useState({'Task Management': true}); 

    const toggleMenu = (menuName) => {
        setOpenMenus(prev => ({...prev, [menuName]: !prev[menuName]}));
    }

  return (
    <aside className="sidebar">
      <nav>
        <ul>
          {menuItems.map((item, index) => (
            <li key={index}>
              {item.subItems ? (
                <>
                  <div className="menu-item" onClick={() => toggleMenu(item.name)}>
                    {/* <i className={item.icon}></i> */}
                    <span>{item.name}</span>
                    <span className={`arrow ${openMenus[item.name] ? 'up' : 'down'}`}></span>
                  </div>
                  {openMenus[item.name] && (
                    <ul className="submenu">
                      {item.subItems.map((subItem, subIndex) => (
                        <li key={subIndex}>
                          <NavLink to={subItem.path}>{subItem.name}</NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <NavLink to={item.path} className="menu-item">
                  <span>{item.name}</span>
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;