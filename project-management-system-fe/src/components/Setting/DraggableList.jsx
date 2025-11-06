// src/components/Setting/DraggableList.jsx
import React from "react";
import DraggableItem from "./DraggableItem";
import "../../styles/Setting/DraggableList.css";

const DraggableList = ({ items, onRefresh, currentTab, moveItem }) => {
  const hasPriority = currentTab === "prioritys";
  const hasDescription = currentTab !== "prioritys";

  return (
    <div className="settings-table-container">
      <table className="settings-table">
        <thead>
          <tr className="settings-table-header">
            <th className="col-drag"></th>
            <th className="col-icon">Icon</th>
            <th className="col-name">Name</th>
            {hasPriority && <th className="col-level">Level</th>}
            {hasDescription && <th className="col-description">Description</th>}
            <th className="col-status">Status</th>
            <th className="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="7" className="empty-state">
                <div className="empty-state-content">
                  <span className="material-symbols-outlined">inbox</span>
                  <p>No items found</p>
                  <span className="empty-state-subtitle">Add a new item to get started</span>
                </div>
              </td>
            </tr>
          ) : (
            items.map((item, index) => (
              <DraggableItem
                key={item._id || index}
                item={item}
                index={index}
                moveItem={moveItem}
                onRefresh={onRefresh}
                currentTab={currentTab}
                asTableRow={true}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DraggableList;
