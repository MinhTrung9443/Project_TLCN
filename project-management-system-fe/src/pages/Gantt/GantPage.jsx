import React, { useState, useEffect, useContext, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import * as ganttService from "../../services/ganttService";
import GanttHeader from "../../components/gantt/GanttHeader";
import GanttLeftSection from "../../components/gantt/GanttLeftSection";
import GanttRightSection from "../../components/gantt/GanttRightSection";
import { generateTimelineColumns, calculateBarPosition, calculateDateRange } from "../../components/gantt/ganttUtils";
import "../../styles/pages/Gantt/GanttPage.css";

const GanttPage = () => {
  // Get user from AuthContext
  const { user } = useAuth();

  // Refs for scroll sync
  const leftSectionRef = useRef(null);
  const rightSectionRef = useRef(null);

  // State
  const [filter, setFilter] = useState({
    projectIds: [],
    groupIds: [],
    assigneeIds: [],
    includeUnassigned: false,
    statusFilter: "active", // Default to active projects only
  });

  const [statusFilter, setStatusFilter] = useState("active"); // 'active', 'all', 'completed', 'archived'
  const [groupBy, setGroupBy] = useState(["project", "sprint", "task"]);
  const [timeView, setTimeView] = useState("weeks"); // weeks, months, years
  const [ganttData, setGanttData] = useState([]);
  const [backlogTasks, setBacklogTasks] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showGroupByPanel, setShowGroupByPanel] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  // Sync scroll between left and right sections
  useEffect(() => {
    const leftSection = leftSectionRef.current;
    const rightSection = rightSectionRef.current;

    if (!leftSection || !rightSection) return;

    const handleLeftScroll = () => {
      rightSection.scrollTop = leftSection.scrollTop;
    };

    const handleRightScroll = () => {
      leftSection.scrollTop = rightSection.scrollTop;
    };

    leftSection.addEventListener("scroll", handleLeftScroll);
    rightSection.addEventListener("scroll", handleRightScroll);

    return () => {
      leftSection.removeEventListener("scroll", handleLeftScroll);
      rightSection.removeEventListener("scroll", handleRightScroll);
    };
  }, []);

  // Fetch Gantt data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Add statusFilter to filter object
        const filterWithStatus = {
          ...filter,
          statusFilter: statusFilter,
        };

        const response = await ganttService.getGanttData(filterWithStatus, groupBy);
        console.log("Gantt Data Response:", response);

        // API trả về { message, data: { type, data, backlogTasks } }
        const ganttResult = response.data || response;
        setGanttData(ganttResult.data || []);
        setBacklogTasks(ganttResult.backlogTasks || []);
      } catch (error) {
        console.error("Error fetching gantt data:", error);
        setGanttData([]);
        setBacklogTasks([]);
      }
    };

    fetchData();
  }, [filter, groupBy, statusFilter]); // Add statusFilter to dependencies

  // Toggle expand/collapse
  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Handle group by change
  const handleGroupByChange = (value) => {
    setGroupBy((prev) => {
      if (prev.includes(value)) {
        return prev.filter((v) => v !== value);
      } else {
        return [...prev, value];
      }
    });
  };

  // Generate timeline columns, include backlogTasks in date range calculation
  const dateRange = calculateDateRange(ganttData, backlogTasks);
  const timelineColumns = generateTimelineColumns(timeView, dateRange.startDate, dateRange.endDate);

  // Filter data based on search keyword
  const filterBySearch = (items, keyword) => {
    if (!keyword || keyword.trim() === "") return items;

    const lowerKeyword = keyword.toLowerCase().trim();

    return items
      .map((item) => {
        const filteredItem = { ...item };

        // Filter tasks at project level
        if (filteredItem.tasks) {
          filteredItem.tasks = filteredItem.tasks.filter(
            (task) =>
              task.key?.toLowerCase().includes(lowerKeyword) ||
              task.name?.toLowerCase().includes(lowerKeyword) ||
              task.assigneeId?.fullname?.toLowerCase().includes(lowerKeyword)
          );
        }

        // Filter sprints and their tasks
        if (filteredItem.sprints) {
          filteredItem.sprints = filteredItem.sprints
            .map((sprint) => {
              const filteredSprint = { ...sprint };
              if (filteredSprint.tasks) {
                filteredSprint.tasks = filteredSprint.tasks.filter(
                  (task) =>
                    task.key?.toLowerCase().includes(lowerKeyword) ||
                    task.name?.toLowerCase().includes(lowerKeyword) ||
                    task.assigneeId?.fullname?.toLowerCase().includes(lowerKeyword)
                );
              }
              return filteredSprint;
            })
            .filter((sprint) => sprint.name?.toLowerCase().includes(lowerKeyword) || (sprint.tasks && sprint.tasks.length > 0));
        }

        // Filter backlog tasks
        if (filteredItem.backlogTasks) {
          filteredItem.backlogTasks = filteredItem.backlogTasks.filter(
            (task) =>
              task.key?.toLowerCase().includes(lowerKeyword) ||
              task.name?.toLowerCase().includes(lowerKeyword) ||
              task.assigneeId?.fullname?.toLowerCase().includes(lowerKeyword)
          );
        }

        return filteredItem;
      })
      .filter(
        (item) =>
          item.name?.toLowerCase().includes(lowerKeyword) ||
          (item.tasks && item.tasks.length > 0) ||
          (item.sprints && item.sprints.length > 0) ||
          (item.backlogTasks && item.backlogTasks.length > 0)
      );
  };

  const filteredGanttData = filterBySearch(ganttData, searchKeyword);
  const filteredBacklogTasks = searchKeyword
    ? backlogTasks.filter(
        (task) =>
          task.key?.toLowerCase().includes(searchKeyword.toLowerCase().trim()) ||
          task.name?.toLowerCase().includes(searchKeyword.toLowerCase().trim()) ||
          task.assigneeId?.fullname?.toLowerCase().includes(searchKeyword.toLowerCase().trim())
      )
    : backlogTasks;

  // Calculate bar position wrapper
  const calculatePosition = (startDate, endDate) => {
    return calculateBarPosition(startDate, endDate, timelineColumns);
  };

  // Calculate task statistics
  const calculateStatistics = () => {
    const stats = {
      atRisk: 0,
      done: 0,
      delay: 0,
      inProgress: 0,
      unplanned: 0,
      total: 0,
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Helper function to count tasks recursively
    const countTasks = (items) => {
      items.forEach((item) => {
        // Count tasks at different levels
        if (item.tasks) {
          item.tasks.forEach((task) => {
            stats.total++;

            // Check status
            const statusName = task.statusId?.name?.toLowerCase() || "";
            const statusCategory = task.statusId?.category?.toLowerCase() || "";
            const dueDate = task.dueDate ? new Date(task.dueDate) : null;

            // Done: status category is 'done'
            if (statusCategory === "done") {
              stats.done++;
            }
            // In Progress: status category is 'in progress'
            else if (statusCategory === "in progress") {
              stats.inProgress++;
            }
            // Delay: past due date and not done
            else if (dueDate && dueDate < today && statusCategory !== "done") {
              stats.delay++;
            }
            // At Risk: due soon (within 3 days) and not done
            else if (dueDate) {
              const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
              if (daysUntilDue >= 0 && daysUntilDue <= 3 && statusCategory !== "done") {
                stats.atRisk++;
              }
            }
            // Unplanned: no start date or end date
            if (!task.startDate && !task.endDate) {
              stats.unplanned++;
            }
          });
        }

        // Recursively count in sprints
        if (item.sprints) {
          countTasks(item.sprints);
        }
      });
    };

    // Count tasks in ganttData
    countTasks(ganttData);

    // Count backlog tasks
    backlogTasks.forEach((task) => {
      stats.total++;

      const statusName = task.statusId?.name?.toLowerCase() || "";
      const statusCategory = task.statusId?.category?.toLowerCase() || "";
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;

      if (statusCategory === "done") {
        stats.done++;
      } else if (statusCategory === "in progress") {
        stats.inProgress++;
      } else if (dueDate && dueDate < today && statusCategory !== "done") {
        stats.delay++;
      } else if (dueDate) {
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        if (daysUntilDue >= 0 && daysUntilDue <= 3 && statusCategory !== "done") {
          stats.atRisk++;
        }
      }

      if (!task.startDate && !task.endDate) {
        stats.unplanned++;
      }
    });

    return stats;
  };

  const statistics = calculateStatistics();

  return (
    <div className="gantt-page" data-timeview={timeView}>
      {/* Header */}
      <GanttHeader
        filter={filter}
        setFilter={setFilter}
        showFilterPanel={showFilterPanel}
        setShowFilterPanel={setShowFilterPanel}
        groupBy={groupBy}
        showGroupByPanel={showGroupByPanel}
        setShowGroupByPanel={setShowGroupByPanel}
        handleGroupByChange={handleGroupByChange}
        timeView={timeView}
        setTimeView={setTimeView}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        statistics={statistics}
        searchKeyword={searchKeyword}
        setSearchKeyword={setSearchKeyword}
      />

      {/* Gantt Chart */}
      <div className="gantt-container">
        {/* Left Section - Fixed */}
        <GanttLeftSection
          projects={filteredGanttData}
          backlogTasks={filteredBacklogTasks}
          groupBy={groupBy}
          expandedItems={expandedItems}
          toggleExpand={toggleExpand}
          leftSectionRef={leftSectionRef}
        />

        {/* Right Section - Scrollable */}
        <GanttRightSection
          projects={filteredGanttData}
          backlogTasks={filteredBacklogTasks}
          groupBy={groupBy}
          expandedItems={expandedItems}
          timelineColumns={timelineColumns}
          calculateBarPosition={calculatePosition}
          rightSectionRef={rightSectionRef}
        />
      </div>
    </div>
  );
};

export default GanttPage;
