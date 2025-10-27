import React, { useState, useEffect, useContext, useRef } from "react";
import * as ganttService from "../../services/ganttService";
import GanttHeader from "../../components/gantt/GanttHeader";
import GanttLeftSection from "../../components/gantt/GanttLeftSection";
import GanttRightSection from "../../components/gantt/GanttRightSection";
import { generateTimelineColumns, calculateBarPosition, calculateDateRange } from "../../components/gantt/ganttUtils";
import "../../styles/pages/Gantt/GanttPage.css";

const GanttPage = () => {
  // Refs for scroll sync
  const leftSectionRef = useRef(null);
  const rightSectionRef = useRef(null);

  // State
  const [filter, setFilter] = useState({
    projectIds: [],
    groupIds: [],
    assigneeIds: [],
    includeUnassigned: false,
  });

  const [groupBy, setGroupBy] = useState(["project", "sprint", "task"]);
  const [timeView, setTimeView] = useState("weeks"); // weeks, months, years
  const [ganttData, setGanttData] = useState([]);
  const [backlogTasks, setBacklogTasks] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showGroupByPanel, setShowGroupByPanel] = useState(false);

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
        const response = await ganttService.getGanttData(filter, groupBy);
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
  }, [filter, groupBy]);

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

  // Calculate bar position wrapper
  const calculatePosition = (startDate, endDate) => {
    return calculateBarPosition(startDate, endDate, timelineColumns);
  };

  return (
    <div className="gantt-page" data-timeview={timeView}>
      {/* Header */}
      <GanttHeader
        filter={filter}
        showFilterPanel={showFilterPanel}
        setShowFilterPanel={setShowFilterPanel}
        groupBy={groupBy}
        showGroupByPanel={showGroupByPanel}
        setShowGroupByPanel={setShowGroupByPanel}
        handleGroupByChange={handleGroupByChange}
        timeView={timeView}
        setTimeView={setTimeView}
      />

      {/* Gantt Chart */}
      <div className="gantt-container">
        {/* Left Section - Fixed */}
        <GanttLeftSection
          projects={ganttData}
          backlogTasks={backlogTasks}
          groupBy={groupBy}
          expandedItems={expandedItems}
          toggleExpand={toggleExpand}
          leftSectionRef={leftSectionRef}
        />

        {/* Right Section - Scrollable */}
        <GanttRightSection
          projects={ganttData}
          backlogTasks={backlogTasks}
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
