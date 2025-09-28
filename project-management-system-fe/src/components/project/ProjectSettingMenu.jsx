import React from 'react';
import { NavLink, useParams } from 'react-router-dom'; 
import "../../styles/Setting/SettingMenu.css"; 

const ProjectSettingMenu = () => {
    const { projectKey } = useParams();

    const menuList = [
        { path: "general", label: "General" },
        { path: "members", label: "Project Members" },
        { path: "tasktype", label: "Task Type" },
        { path: "priority", label: "Priority" },
        { path: "platform", label: "Platform" },
    ];

    return (
        <nav className="setting-menu">
            <ul>
                {menuList.map((item) => (
                    <li key={item.path}>
                        <NavLink
                            to={`/task-mgmt/projects/${projectKey}/settings/${item.path}`}
                        >
                            <span>{item.label}</span>
                        </NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    );
};

export default ProjectSettingMenu;