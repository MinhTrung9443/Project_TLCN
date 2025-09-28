import React from 'react';
import { FaPlus } from 'react-icons/fa';

const SettingMenu = ({ activeTab, onTabChange, onCreate }) => {
    const menuItems = ['TaskTypes', 'Priorities', 'Platforms'];

    const getButtonText = () => {
        switch (activeTab.toLowerCase()) {
            case 'priorities': return 'Create Priority';
            case 'platforms': return 'Create Platform';
            default: return 'Create TaskType';
        }
    };

    return (
        <div className="setting-menu-container">
            <nav className="setting-tabs">
                {menuItems.map(item => (
                    <button
                        key={item}
                        className={`tab-item ${activeTab.toLowerCase() === item.toLowerCase() ? 'active' : ''}`}
                        onClick={() => onTabChange(item)}
                    >
                        {item}
                    </button>
                ))}
            </nav>
            <div className="setting-actions">
                {onCreate && (
                    <button className="btn btn-primary" onClick={onCreate}>
                        <FaPlus style={{ marginRight: '8px' }} />
                        {getButtonText()}
                    </button>
                )}
            </div>
        </div>
    );
};

export default SettingMenu;