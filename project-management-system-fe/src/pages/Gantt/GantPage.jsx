import React, { useState, useEffect, useContext, useRef } from "react";
import { ProjectContext } from "../../contexts/ProjectContext";
import GanttHeader from "../../components/gantt/GanttHeader";
import GanttLeftSection from "../../components/gantt/GanttLeftSection";
import GanttRightSection from "../../components/gantt/GanttRightSection";
import { generateTimelineColumns, calculateBarPosition } from "../../components/gantt/ganttUtils";
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

  // Mock data for demonstration
  const mockProjects = [
    {
      id: "1",
      name: "ICT Triển khai",
      key: "ICT",
      startDate: "2022-05-09",
      endDate: "2022-07-15",
      sprints: [
        {
          id: "s1",
          name: "Sprint 1",
          startDate: "2022-05-09",
          endDate: "2022-05-23",
          tasks: [
            { id: "t1", name: "Setup infrastructure", startDate: "2022-05-09", endDate: "2022-05-15" },
            { id: "t2", name: "Design database", startDate: "2022-05-16", endDate: "2022-05-23" },
          ],
        },
      ],
    },
    {
      id: "2",
      name: "ETL Triển khai",
      key: "ETL",
      startDate: "2022-09-04",
      endDate: "2022-09-08",
      sprints: [],
    },
  ];

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

  // Generate timeline columns, 
  const timelineColumns = generateTimelineColumns(timeView);

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
          projects={mockProjects}
          groupBy={groupBy}
          expandedItems={expandedItems}
          toggleExpand={toggleExpand}
          leftSectionRef={leftSectionRef}
        />

        {/* Right Section - Scrollable */}
        <GanttRightSection
          projects={mockProjects}
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
