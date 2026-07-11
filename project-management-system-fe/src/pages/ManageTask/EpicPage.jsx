import React, { useState, useContext, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ProjectContext } from "../../contexts/ProjectContext";
import { useAuth } from "../../contexts/AuthContext";
import { searchTasks } from "../../services/taskService";
import { getProjectByKey } from "../../services/projectService";
import workflowService from "../../services/workflowService";
import sprintService from "../../services/sprintService";
import TaskDetailPanel from "../../components/task/TaskDetailPanel";
import PageHeader from "../../components/ui/PageHeader";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import { VscTasklist } from "react-icons/vsc";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import CreateTaskModal from "../../components/task/CreateTaskModal";
import { IconComponent } from "../../components/common/IconPicker";

const PREDEFINED_TASKTYPE_ICONS = [
  { name: "FaTasks", color: "#4BADE8" },
  { name: "FaStar", color: "#2ECC71" },
  { name: "FaCheckSquare", color: "#5297FF" },
  { name: "FaRegWindowMaximize", color: "#00A8A2" },
  { name: "FaBug", color: "#E44D42" },
  { name: "FaArrowUp", color: "#F57C00" },
  { name: "FaBullseye", color: "#654DF7" },
  { name: "FaQuestionCircle", color: "#7A869A" },
  { name: "FaRegClone", color: "#4BADE8" },
  { name: "FaEquals", color: "#DE350B" },
  { name: "FaFileAlt", color: "#00B8D9" },
];

const PREDEFINED_PRIORITY_ICONS = [
  { name: "FaFire", color: "#CD1317" },
  { name: "FaExclamationCircle", color: "#E94F37" },
  { name: "FaArrowUp", color: "#F4A261" },
  { name: "FaArrowAltCircleUp", color: "#F57C00" },
  { name: "FaEquals", color: "#2A9D8F" },
  { name: "FaPlusCircle", color: "#45B8AC" },
  { name: "FaMinusCircle", color: "#264653" },
  { name: "FaArrowDown", color: "#2196F3" },
  { name: "FaArrowAltCircleDown", color: "#03A9F4" },
  { name: "FaExclamationTriangle", color: "#FFB300" },
];

const EpicPage = () => {
  const { projectKey } = useParams();
  const { user } = useAuth();
  const { selectedProjectKey } = useContext(ProjectContext);
  
  const [projectData, setProjectData] = useState(null);
  const [userProjectRole, setUserProjectRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [epicsList, setEpicsList] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [expandedEpics, setExpandedEpics] = useState({});
  const [selectedEpic, setSelectedEpic] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectOptions, setSelectOptions] = useState({
    statuses: [],
    priorities: [],
    taskTypes: [],
    platforms: [],
    sprints: []
  });

  const fetchProjectDetails = async () => {
    try {
      const res = await getProjectByKey(projectKey);
      setProjectData(res.data);

      let role = null;
      const uid = user._id;

      if (user.role === "admin") role = "ADMIN";
      else {
        const pm = res.data.members?.find((m) => (m.userId?._id || m.userId) === uid && m.role === "PROJECT_MANAGER");
        if (pm) role = "PROJECT_MANAGER";
        else if (res.data.teams?.some((t) => (t.leaderId?._id || t.leaderId) === uid)) role = "LEADER";
        else if (res.data.teams?.some((t) => t.members?.some((m) => (m?._id || m) === uid))) role = "MEMBER";
      }
      setUserProjectRole(role);

      const wfRes = await workflowService.getWorkflowByProject(projectKey);
      const sprintsData = await sprintService.getSprints(projectKey);
      setSelectOptions({
        statuses: wfRes.statuses || [],
        priorities: res.data.priorities || [],
        taskTypes: res.data.taskTypes || [],
        platforms: res.data.platforms || [],
        sprints: sprintsData.sprint || []
      });
      
      return res.data;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const fetchEpics = async (proj) => {
    if (!proj) return;
    try {
      setLoading(true);
      const res = await searchTasks({ projectId: proj._id, keyword: "" });
      const allT = res.data || [];
      setAllTasks(allT);
      const epics = allT.filter(t => t.taskTypeId?.name?.toLowerCase()?.includes("epic"));
      setEpicsList(epics);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectKey) {
      fetchProjectDetails().then(proj => fetchEpics(proj));
    }
  }, [projectKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading epics..." />
      </div>
    );
  }

  // Only PM or Admin
  if (user?.role !== "admin" && userProjectRole !== "PROJECT_MANAGER") {
    return (
      <div className="p-8">
        <EmptyState icon="lock" title="Access Denied" description="Only Project Managers can view Epics." />
      </div>
    );
  }

  const isTaskDone = (task) => {
    if (!task || !task.statusId) return false;
    const statusObj = selectOptions.statuses.find(s => s._id === (task.statusId._id || task.statusId));
    return statusObj?.category?.toUpperCase() === "DONE";
  };

  const getChildStories = (epicId) => {
    if (!epicId) return [];
    const epicIdStr = epicId.toString();
    return allTasks.filter(t => 
      t.parentTaskId && 
      (t.parentTaskId._id?.toString() === epicIdStr || t.parentTaskId.toString() === epicIdStr) && 
      t.taskTypeId?.name?.toLowerCase().includes("story")
    );
  };

  const getChildTasks = (taskId) => {
    if (!taskId) return [];
    const taskIdStr = taskId.toString();
    return allTasks.filter(t => 
      t.parentTaskId && 
      (t.parentTaskId._id?.toString() === taskIdStr || t.parentTaskId.toString() === taskIdStr)
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 relative">
      <PageHeader
        icon={VscTasklist}
        title="Epics"
        description="Manage project epics and their children"
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            Create Epic
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
          {epicsList.length === 0 ? (
            <EmptyState icon="task" title="No Epics found" description="Create an Epic from the Task Finder or Backlog." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow hoverable={false}>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead className="w-1/3">Epic Name</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignee / Due Date</TableHead>
                  <TableHead>Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {epicsList.map(epic => {
                  const stories = getChildStories(epic._id);
                  const completedStories = stories.filter(isTaskDone);
                  const progressPct = stories.length > 0 ? Math.round((completedStories.length / stories.length) * 100) : (isTaskDone(epic) ? 100 : 0);
                  const isExpanded = expandedEpics[epic._id];
                  
                  return (
                    <React.Fragment key={epic._id}>
                      <TableRow onClick={() => setSelectedEpic(epic)} className={`cursor-pointer hover:bg-neutral-50 transition-colors ${isExpanded ? 'bg-neutral-50/30' : ''}`}>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setExpandedEpics(prev => ({...prev, [epic._id]: !prev[epic._id]})) }}
                            className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 rounded flex items-center justify-center transition-colors"
                          >
                            <span className={`material-symbols-outlined text-[20px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              expand_more
                            </span>
                          </button>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {epic.taskTypeId?.icon && (
                              <span 
                                className="w-6 h-6 rounded text-white flex items-center justify-center text-sm flex-shrink-0 shadow-sm"
                                style={{ backgroundColor: epic.taskTypeId.color || PREDEFINED_TASKTYPE_ICONS.find(i => i.name === epic.taskTypeId?.icon)?.color || '#6B7280' }}
                                title={epic.taskTypeId.name}
                              >
                                <IconComponent name={epic.taskTypeId.icon} />
                              </span>
                            )}
                            <span className="text-xs px-2 py-0.5 rounded bg-primary-50 text-primary-700 border border-primary-200 font-semibold">{epic.key}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-neutral-900">{epic.name}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {epic.priorityId && (
                            <div className="flex items-center gap-1.5" title={epic.priorityId.name}>
                              <span style={{ color: epic.priorityId.color || PREDEFINED_PRIORITY_ICONS.find(p => p.name === epic.priorityId?.icon)?.color || '#6B7280' }}>
                                <IconComponent name={epic.priorityId.icon} />
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="px-2 py-1 bg-neutral-100 rounded text-xs">{epic.statusId?.name || "Unknown"}</span>
                        </TableCell>
                        <TableCell>
                          {epic.dueDate ? (
                            <div className={`text-sm ${new Date(epic.dueDate) < new Date() ? 'text-danger-600 font-medium' : 'text-neutral-700'}`}>
                              {new Date(epic.dueDate).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-sm text-neutral-400">No date</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3 w-48">
                            <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-500 ${progressPct === 100 ? 'bg-success-500' : 'bg-primary-500'}`} style={{width: `${progressPct}%`}}></div>
                            </div>
                            <div className="flex flex-col items-end w-16 shrink-0">
                               <span className="text-xs font-bold text-neutral-700">{progressPct}%</span>
                               <span className="text-[10px] text-neutral-500">{completedStories.length}/{stories.length} done</span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {isExpanded && stories.length > 0 && stories.map((story, idx) => (
                         <TableRow key={story._id} className="group hover:bg-neutral-100/60 cursor-pointer bg-neutral-50/50 transition-colors" onClick={() => setSelectedEpic(story)}>
                            <TableCell className="relative">
                               {/* Tree line connecting to parent */}
                               <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary-200 -translate-x-1/2"></div>
                               {idx === stories.length - 1 && <div className="absolute left-1/2 top-1/2 bottom-0 w-px bg-neutral-50/50 -translate-x-1/2 z-10"></div>}
                               <div className="absolute left-1/2 top-1/2 w-4 h-px bg-primary-200"></div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {story.taskTypeId?.icon && (
                                  <span 
                                    className="w-5 h-5 rounded text-white flex items-center justify-center text-[10px] flex-shrink-0 shadow-sm"
                                    style={{ backgroundColor: story.taskTypeId.color || PREDEFINED_TASKTYPE_ICONS.find(i => i.name === story.taskTypeId?.icon)?.color || '#6B7280' }}
                                    title={story.taskTypeId.name}
                                  >
                                    <IconComponent name={story.taskTypeId.icon} />
                                  </span>
                                )}
                                <span className="text-xs px-1.5 py-0.5 rounded bg-white text-neutral-600 border border-neutral-200 font-medium shadow-sm">{story.key}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-neutral-800 font-medium text-sm truncate max-w-sm">
                                {story.name}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {story.priorityId && (
                                <div className="flex items-center gap-1.5" title={story.priorityId.name}>
                                  <span style={{ color: story.priorityId.color || PREDEFINED_PRIORITY_ICONS.find(p => p.name === story.priorityId?.icon)?.color || '#6B7280' }}>
                                    <IconComponent name={story.priorityId.icon} />
                                  </span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <span className={`px-2 py-0.5 border rounded text-xs shadow-sm font-medium ${isTaskDone(story) ? 'bg-success-50 text-success-700 border-success-200' : 'bg-white text-neutral-600 border-neutral-200'}`}>
                                {story.statusId?.name || "Unknown"}
                              </span>
                            </TableCell>
                            <TableCell>
                              {story.assigneeId ? (
                                 <div className="flex items-center gap-2">
                                   {story.assigneeId.avatar ? (
                                     <img src={story.assigneeId.avatar} className="w-5 h-5 rounded-full" alt="Avatar"/>
                                   ) : (
                                     <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-[10px] text-primary-700 font-bold">{story.assigneeId.fullname?.charAt(0)}</div>
                                   )}
                                   <span className="text-sm font-medium text-neutral-700 truncate">{story.assigneeId.fullname}</span>
                                 </div>
                               ) : (
                                 <span className="text-sm text-neutral-400 italic">Unassigned</span>
                               )}
                            </TableCell>
                            <TableCell>
                               {(() => {
                                  const storyTasks = getChildTasks(story._id);
                                  const completedTasks = storyTasks.filter(isTaskDone);
                                  const storyProgressPct = storyTasks.length > 0 ? Math.round((completedTasks.length / storyTasks.length) * 100) : (isTaskDone(story) ? 100 : 0);
                                  
                                  return (
                                    <div className="flex items-center gap-3 w-48">
                                      <div className="flex-1 h-1.5 bg-neutral-200/60 shadow-inner rounded-full overflow-hidden">
                                        <div className={`h-full transition-all duration-500 ${storyProgressPct === 100 ? 'bg-success-500' : 'bg-primary-500'}`} style={{width: `${storyProgressPct}%`}}></div>
                                      </div>
                                      <div className="flex flex-col items-end w-16 shrink-0">
                                         <span className="text-xs font-bold text-neutral-700">{storyProgressPct}%</span>
                                         <span className="text-[10px] text-neutral-500">{completedTasks.length}/{storyTasks.length} done</span>
                                      </div>
                                    </div>
                                  );
                               })()}
                            </TableCell>
                         </TableRow>
                      ))}

                      {isExpanded && stories.length === 0 && (
                         <TableRow className="bg-neutral-50/30">
                            <TableCell className="relative">
                               <div className="absolute left-1/2 top-0 bottom-1/2 w-px bg-primary-200 -translate-x-1/2"></div>
                               <div className="absolute left-1/2 top-1/2 w-4 h-px bg-primary-200"></div>
                            </TableCell>
                            <TableCell colSpan={5}>
                               <span className="text-sm text-neutral-400 italic">No stories under this Epic yet.</span>
                            </TableCell>
                         </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {selectedEpic && (
        <div className="fixed inset-y-0 right-0 w-[800px] z-[60] bg-white shadow-2xl border-l border-neutral-200 flex flex-col">
          <TaskDetailPanel
            key={selectedEpic._id}
            task={selectedEpic}
            onClose={() => setSelectedEpic(null)}
            onTaskUpdate={(updatedEpic) => {
              setEpicsList(prev => prev.map(e => e._id === updatedEpic._id ? updatedEpic : e));
              setSelectedEpic(updatedEpic);
            }}
            onTaskDelete={(taskId) => {
              setEpicsList(prev => prev.filter(e => e._id !== taskId));
              setSelectedEpic(null);
            }}
            statuses={selectOptions.statuses}
            platforms={selectOptions.platforms}
            priorities={selectOptions.priorities}
            taskTypes={selectOptions.taskTypes}
            sprints={selectOptions.sprints}
            isCompact={false}
          />
        </div>
      )}
      
      {selectedEpic && (
        <div 
          className="fixed inset-0 bg-neutral-900/20 z-[50] transition-opacity" 
          onClick={() => setSelectedEpic(null)}
        />
      )}

      {isCreateModalOpen && (
        <CreateTaskModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onTaskCreated={() => fetchEpics(projectData)}
          defaultProjectId={projectData?._id}
        />
      )}
    </div>
  );
};

export default EpicPage;
