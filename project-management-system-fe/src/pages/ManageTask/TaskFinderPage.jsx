import React, { useState, useEffect, useContext } from 'react';
import { ProjectContext } from '../../contexts/ProjectContext';
import { getTasksByProject } from '../../services/taskService';
import { toast } from 'react-toastify';
import '../../styles/pages/ManageTask/TaskFinderPage.css';
import CreateTaskModal from '../../components/task/CreateTaskModal';
import { FaUserCircle } from 'react-icons/fa';

import { IconComponent } from '../../components/common/IconPicker'; 


const PREDEFINED_TASKTYPE_ICONS = [
    { name: "VscCheck", color: "#27AE60" },      // Task
    { name: "VscBug", color: "#E74C3C" },        // Bug
    { name: "VscBook", color: "#3498DB" },       // Story
    { name: "VscLightbulb", color: "#F1C40F" }, // New Feature
    { name: "VscMilestone", color: "#9B59B6" },  // Epic
    { name: "VscBeaker", color: "#1ABC9C" },     // Spike/Research
    { name: "VscTools", color: "#34495E" },      // Improvement
    { name: "VscComment", color: "#95A5A6" },   // Feedback
];

const PREDEFINED_PLATFORM_ICONS = [
    { name: "FaCode", color: "#8E44AD" },
    { name: "FaCog", color: "#E74C3C" },
    { name: "FaCubes", color: "#27AE60" },
    { name: "FaExpandArrowsAlt", color: "#3498DB" },
    { name: "FaApple", color: "#95A5A6" },
    { name: "FaAndroid", color: "#2ECC71" },
    { name: "FaChartBar", color: "#34495E" },
    { name: "FaTerminal", color: "#F1C40F" },
    { name: "FaPalette", color: "#9B59B6" },
    { name: "FaFlask", color: "#C0392B" },
];

const PREDEFINED_PRIORITY_ICONS = [
  { name: 'FaExclamationCircle', color: '#CD1317' }, // Critical
  { name: 'FaArrowUp', color: '#F57C00' }, // High
  { name: 'FaEquals', color: '#2A9D8F' }, // Medium
  { name: 'FaArrowDown', color: '#2196F3' }, // Low
  { name: 'FaFire', color: '#E94F37' },
  { name: 'FaExclamationTriangle', color: '#FFB300' },
];


const TaskRow = ({ task }) => {
  const renderAvatar = (user) => {
    if (user?.avatar) {
      return <img src={user.avatar} alt={user.fullname} className="avatar" />;
    }
    return <div className="avatar default-avatar">{user?.fullname ? user.fullname.charAt(0).toUpperCase() : <FaUserCircle />}</div>;
  };


  const typeIconInfo = PREDEFINED_TASKTYPE_ICONS.find(i => i.name === task.taskTypeId?.icon);
  const platformIconInfo = PREDEFINED_PLATFORM_ICONS.find(i => i.name === task.platformId?.icon);
  const priorityIconInfo = PREDEFINED_PRIORITY_ICONS.find(i => i.name === task.priorityId?.icon);

  return (
    <div className="task-row">
      <div className="task-cell task-key">
        {/* Render icon Task Type */}
        {typeIconInfo && (
          <span className="icon-wrapper-list-small" style={{ backgroundColor: typeIconInfo.color }} title={task.taskTypeId.name}>
            <IconComponent name={task.taskTypeId.icon} />
          </span>
        )}
        <span>{task.key}</span>
      </div>
      <div className="task-cell task-name">{task.name}</div>
      <div className="task-cell task-sprint">{task.sprintId?.name || 'Backlog'}</div>
      
      <div className="task-cell task-platform">
        {/* Render icon Platform */}
        {platformIconInfo && (
          <span className="icon-wrapper-list" style={{ backgroundColor: platformIconInfo.color }} title={task.platformId.name}>
            <IconComponent name={task.platformId.icon} />
          </span>
        )}
      </div>

      <div className="task-cell task-assignee">{renderAvatar(task.assigneeId)}</div>
      <div className="task-cell task-reporter">{renderAvatar(task.reporterId)}</div>
      <div className="task-cell task-priority">
        {/* Render icon Priority */}
        {priorityIconInfo && (
          <span className="icon-wrapper-list" style={{ backgroundColor: priorityIconInfo.color }} title={task.priorityId.name}>
            <IconComponent name={task.priorityId.icon} />
          </span>
        )}
      </div>
      <div className="task-cell task-status">
        <span className="status-pill" style={{ backgroundColor: task.statusId?.color || '#ccc' }}>
          {task.statusId?.name}
        </span>
      </div>
      <div className="task-cell task-due-date">
        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
      </div>
    </div>
  );
};

const TaskFinderPage = ({ /* ...props */ }) => {
    const { selectedProjectKey } = useContext(ProjectContext);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (!selectedProjectKey) {
            setLoading(false);
            setTasks([]);
            return;
        }
        const fetchTasks = async () => {
            setLoading(true);
            try {
                const response = await getTasksByProject(selectedProjectKey);
                setTasks(response.data);
            } catch (error) {
                toast.error('Could not fetch tasks for this project.');
                setTasks([]);
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, [selectedProjectKey]);

    const handleTaskCreated = (newTask) => {
        setTasks(prevTasks => [newTask, ...prevTasks]);
    };

    return (
        <>
            <CreateTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onTaskCreated={handleTaskCreated} />
            <div className="task-finder-container">
                <header className="task-finder-header">
                    <h1>Task Finder</h1>
                    <button className="create-task-btn" onClick={() => setIsModalOpen(true)}>CREATE TASK</button>
                </header>
                <div className="task-list-container">
                    <div className="task-list-header">
                        <div className="task-cell task-key">Key</div>
                        <div className="task-cell task-name">Name</div>
                        <div className="task-cell task-sprint">Sprint</div>
                        <div className="task-cell task-platform">Platform</div>
                        <div className="task-cell task-assignee">Assignee</div>
                        <div className="task-cell task-reporter">Reporter</div>
                        <div className="task-cell task-priority">Priority</div>
                        <div className="task-cell task-status">Status</div>
                        <div className="task-cell task-due-date">Due Date</div>
                    </div>
                    <div className="task-list-body">
                        {loading ? (<p className="loading-text">Loading tasks...</p>) : !selectedProjectKey ? (<p className="info-text">Please select a project to see tasks.</p>) : tasks.length === 0 ? (<p className="info-text">No tasks found for this project.</p>) : (tasks.map(task => <TaskRow key={task._id} task={task} />))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default TaskFinderPage;