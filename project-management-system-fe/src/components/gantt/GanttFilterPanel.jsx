import React, { useState, useEffect } from "react";
import { getProjects } from "../../services/projectService";
import { groupService } from "../../services/groupService";
import userService from "../../services/userService";

// Handle date range filter
// Đặt function này sau import, trong component

const GanttFilterPanel = ({ filter, setFilter, showFilterPanel, filterRef }) => {
  const [projects, setProjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Handle date range filter
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projectsRes, groupsRes, usersRes] = await Promise.all([getProjects(), groupService.getGroups(), userService.fetchAllUsers()]);

        // Handle different response formats
        const projectsData = projectsRes.data?.data || projectsRes.data || [];
        const groupsData = groupsRes.data?.data || groupsRes.data || [];

        // Users API returns array directly or in data property
        let usersData = [];
        if (Array.isArray(usersRes)) {
          usersData = usersRes;
        } else if (Array.isArray(usersRes.data)) {
          usersData = usersRes.data;
        } else if (usersRes.data?.users) {
          usersData = usersRes.data.users;
        } else if (usersRes.data?.data) {
          usersData = usersRes.data.data;
        }

        console.log("Filter data fetched:", {
          projectsData,
          groupsData,
          usersData,
          usersResType: typeof usersRes,
          usersResIsArray: Array.isArray(usersRes),
        });

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
    setFilter((prev) => ({
      ...prev,
      projectIds: [],
      groupIds: [],
      assigneeIds: [],
      includeUnassigned: false,
      startDate: "",
      endDate: "",
      // statusFilter: prev.statusFilter || 'active', // preserve statusFilter if present
    }));
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
    <div
      className="fixed top-24 left-6 w-80 bg-white rounded-lg shadow-lg border border-gray-200 max-h-[calc(100vh-120px)] overflow-y-auto z-40"
      ref={filterRef}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
        <h3 className="flex items-center gap-2 font-semibold text-gray-900">
          <span className="material-symbols-outlined">filter_alt</span>
          Filter
        </h3>
        <button
          className="text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded px-3 py-1 transition-colors"
          onClick={handleClearAll}
        >
          Clear All
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <div className="w-6 h-6 border-3 border-purple-300 border-t-white rounded-full animate-spin mb-2"></div>
          <span className="text-sm">Loading filters...</span>
        </div>
      ) : (
        <div className="space-y-4 p-4">
          {/* Date Range Section */}
          <div className="space-y-2 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 text-sm">Date Range</h4>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                name="startDate"
                value={filter.startDate || ""}
                onChange={handleDateChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Start date"
              />
              <span className="text-gray-500 text-sm font-medium">to</span>
              <input
                type="date"
                name="endDate"
                value={filter.endDate || ""}
                onChange={handleDateChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="End date"
              />
            </div>
          </div>
          {/* Projects Section */}
          <div className="space-y-2 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 text-sm">
                Projects ({filter.projectIds.length}/{projects.length})
              </h4>
              <button
                className="text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded px-2 py-1 transition-colors"
                onClick={handleSelectAllProjects}
              >
                {filter.projectIds.length === projects.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="space-y-1">
              {projects.length === 0 ? (
                <div className="text-sm text-gray-500 py-2">No projects found</div>
              ) : (
                projects.map((project) => (
                  <label key={project._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filter.projectIds.includes(project._id)}
                      onChange={() => handleProjectToggle(project._id)}
                      className="w-4 h-4 rounded accent-purple-600"
                    />
                    <span className="flex items-center justify-center w-6 h-6 text-gray-600">
                      <span className="material-symbols-outlined text-lg">folder</span>
                    </span>
                    <span className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{project.name}</div>
                      <div className="text-xs text-gray-500">{project.key}</div>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Groups Section */}
          <div className="space-y-2 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 text-sm">
                Groups ({filter.groupIds.length}/{groups.length})
              </h4>
              <button
                className="text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded px-2 py-1 transition-colors"
                onClick={handleSelectAllGroups}
              >
                {filter.groupIds.length === groups.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="space-y-1">
              {groups.length === 0 ? (
                <div className="text-sm text-gray-500 py-2">No groups found</div>
              ) : (
                groups.map((group) => (
                  <label key={group._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filter.groupIds.includes(group._id)}
                      onChange={() => handleGroupToggle(group._id)}
                      className="w-4 h-4 rounded accent-purple-600"
                    />
                    <span className="flex items-center justify-center w-6 h-6 text-purple-600">
                      <span className="material-symbols-outlined text-lg">group</span>
                    </span>
                    <span className="text-sm font-medium text-gray-900 flex-1">{group.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Users Section */}
          <div className="space-y-2 pb-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 text-sm">
                Assignees ({filter.assigneeIds.length}/{users.length})
              </h4>
              <button
                className="text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded px-2 py-1 transition-colors"
                onClick={handleSelectAllUsers}
              >
                {filter.assigneeIds.length === users.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={filter.includeUnassigned}
                  onChange={handleUnassignedToggle}
                  className="w-4 h-4 rounded accent-purple-600"
                />
                <span className="flex items-center justify-center w-6 h-6 text-gray-400">
                  <span className="material-symbols-outlined text-lg">person_off</span>
                </span>
                <span className="text-sm font-medium text-gray-900 flex-1">Unassigned Tasks</span>
              </label>

              {users.length === 0 ? (
                <div className="text-sm text-gray-500 py-2">No users found</div>
              ) : (
                users.map((user) => (
                  <label key={user._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filter.assigneeIds.includes(user._id)}
                      onChange={() => handleUserToggle(user._id)}
                      className="w-4 h-4 rounded accent-purple-600"
                    />
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.fullname} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <span className="flex items-center justify-center w-6 h-6 bg-purple-100 text-purple-600 rounded-full text-sm font-semibold flex-shrink-0">
                        {user.fullname?.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{user.fullname}</div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
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
