import React, { useState, useEffect } from "react";
import { getProjects } from "../../services/projectService";
import { groupService } from "../../services/groupService";
import userService from "../../services/userService";
import "../../styles/components/gantt/GanttFilterPanel.css";

const GanttFilterPanel = ({ filter, setFilter, showFilterPanel, filterRef }) => {
  const [projects, setProjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projectsRes, groupsRes, usersRes] = await Promise.all([getProjects(), groupService.getGroups(), userService.getUsers()]);

        // Handle different response formats
        const projectsData = projectsRes.data?.data || projectsRes.data || [];
        const groupsData = groupsRes.data?.data || groupsRes.data || [];
        const usersData = usersRes.data?.data || usersRes.data?.users || usersRes.data || [];

        console.log("Filter data fetched:", { projectsData, groupsData, usersData });

        setProjects(Array.isArray(projectsData) ? projectsData : []);
        setGroups(Array.isArray(groupsData) ? groupsData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (error) {
        console.error("Error fetching filter data:", error);
        setProjects([]);
        setGroups([]);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    if (showFilterPanel) {
      fetchData();
    }
  }, [showFilterPanel]);

  // Handle project selection
  const handleProjectToggle = (projectId) => {
    setFilter((prev) => {
      const newProjectIds = prev.projectIds.includes(projectId) ? prev.projectIds.filter((id) => id !== projectId) : [...prev.projectIds, projectId];
      return { ...prev, projectIds: newProjectIds };
    });
  };

  // Handle group selection
  const handleGroupToggle = (groupId) => {
    setFilter((prev) => {
      const newGroupIds = prev.groupIds.includes(groupId) ? prev.groupIds.filter((id) => id !== groupId) : [...prev.groupIds, groupId];
      return { ...prev, groupIds: newGroupIds };
    });
  };

  // Handle user selection
  const handleUserToggle = (userId) => {
    setFilter((prev) => {
      const newAssigneeIds = prev.assigneeIds.includes(userId) ? prev.assigneeIds.filter((id) => id !== userId) : [...prev.assigneeIds, userId];
      return { ...prev, assigneeIds: newAssigneeIds };
    });
  };

  // Handle include unassigned
  const handleUnassignedToggle = () => {
    setFilter((prev) => ({
      ...prev,
      includeUnassigned: !prev.includeUnassigned,
    }));
  };

  // Clear all filters
  const handleClearAll = () => {
    setFilter({
      projectIds: [],
      groupIds: [],
      assigneeIds: [],
      includeUnassigned: false,
    });
  };

  // Select all projects
  const handleSelectAllProjects = () => {
    if (filter.projectIds.length === projects.length) {
      setFilter((prev) => ({ ...prev, projectIds: [] }));
    } else {
      setFilter((prev) => ({
        ...prev,
        projectIds: projects.map((p) => p._id),
      }));
    }
  };

  // Select all groups
  const handleSelectAllGroups = () => {
    if (filter.groupIds.length === groups.length) {
      setFilter((prev) => ({ ...prev, groupIds: [] }));
    } else {
      setFilter((prev) => ({
        ...prev,
        groupIds: groups.map((g) => g._id),
      }));
    }
  };

  // Select all users
  const handleSelectAllUsers = () => {
    if (filter.assigneeIds.length === users.length) {
      setFilter((prev) => ({ ...prev, assigneeIds: [] }));
    } else {
      setFilter((prev) => ({
        ...prev,
        assigneeIds: users.map((u) => u._id),
      }));
    }
  };

  if (!showFilterPanel) return null;

  return (
    <div className="gantt-filter-panel" ref={filterRef}>
      <div className="gantt-filter-panel-header">
        <h3>
          <span className="material-symbols-outlined">filter_alt</span>
          Filter
        </h3>
        <button className="gantt-filter-clear-btn" onClick={handleClearAll}>
          Clear All
        </button>
      </div>

      {loading ? (
        <div className="gantt-filter-loading">
          <div className="spinner"></div>
          <span>Loading filters...</span>
        </div>
      ) : (
        <div className="gantt-filter-panel-content">
          {/* Projects Section */}
          <div className="gantt-filter-section">
            <div className="gantt-filter-section-header">
              <h4>
                Projects ({filter.projectIds.length}/{projects.length})
              </h4>
              <button className="gantt-filter-select-all" onClick={handleSelectAllProjects}>
                {filter.projectIds.length === projects.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="gantt-filter-list">
              {projects.length === 0 ? (
                <div className="gantt-filter-empty">No projects found</div>
              ) : (
                projects.map((project) => (
                  <label key={project._id} className="gantt-filter-item">
                    <input type="checkbox" checked={filter.projectIds.includes(project._id)} onChange={() => handleProjectToggle(project._id)} />
                    <span className="gantt-filter-item-icon project-icon">
                      <span className="material-symbols-outlined">folder</span>
                    </span>
                    <span className="gantt-filter-item-text">
                      <span className="gantt-filter-item-name">{project.name}</span>
                      <span className="gantt-filter-item-key">{project.key}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Groups Section */}
          <div className="gantt-filter-section">
            <div className="gantt-filter-section-header">
              <h4>
                Groups ({filter.groupIds.length}/{groups.length})
              </h4>
              <button className="gantt-filter-select-all" onClick={handleSelectAllGroups}>
                {filter.groupIds.length === groups.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="gantt-filter-list">
              {groups.length === 0 ? (
                <div className="gantt-filter-empty">No groups found</div>
              ) : (
                groups.map((group) => (
                  <label key={group._id} className="gantt-filter-item">
                    <input type="checkbox" checked={filter.groupIds.includes(group._id)} onChange={() => handleGroupToggle(group._id)} />
                    <span className="gantt-filter-item-icon group-icon">
                      <span className="material-symbols-outlined">group</span>
                    </span>
                    <span className="gantt-filter-item-text">
                      <span className="gantt-filter-item-name">{group.name}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Users Section */}
          <div className="gantt-filter-section">
            <div className="gantt-filter-section-header">
              <h4>
                Assignees ({filter.assigneeIds.length}/{users.length})
              </h4>
              <button className="gantt-filter-select-all" onClick={handleSelectAllUsers}>
                {filter.assigneeIds.length === users.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="gantt-filter-list">
              <label className="gantt-filter-item gantt-filter-item-special">
                <input type="checkbox" checked={filter.includeUnassigned} onChange={handleUnassignedToggle} />
                <span className="gantt-filter-item-icon unassigned-icon">
                  <span className="material-symbols-outlined">person_off</span>
                </span>
                <span className="gantt-filter-item-text">
                  <span className="gantt-filter-item-name">Unassigned Tasks</span>
                </span>
              </label>

              {users.length === 0 ? (
                <div className="gantt-filter-empty">No users found</div>
              ) : (
                users.map((user) => (
                  <label key={user._id} className="gantt-filter-item">
                    <input type="checkbox" checked={filter.assigneeIds.includes(user._id)} onChange={() => handleUserToggle(user._id)} />
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.fullname} className="gantt-filter-item-avatar" />
                    ) : (
                      <span className="gantt-filter-item-icon user-icon">
                        <span className="material-symbols-outlined">person</span>
                      </span>
                    )}
                    <span className="gantt-filter-item-text">
                      <span className="gantt-filter-item-name">{user.fullname}</span>
                      <span className="gantt-filter-item-email">{user.email}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GanttFilterPanel;
