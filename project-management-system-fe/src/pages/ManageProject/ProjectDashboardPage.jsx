import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getProjectDetails } from "../../services/projectService";
import sprintService from "../../services/sprintService";
import workflowService from "../../services/workflowService";
import { getProjectAuditLogs } from "../../services/auditLogService";
import PageHeader from "../../components/ui/PageHeader";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import Card from "../../components/ui/Card";
import { Table } from "../../components/ui/Table";
import * as FaIcons from "react-icons/fa";

const isTaskDone = (task, workflowStatuses = []) => {
  if (workflowStatuses && workflowStatuses.length > 0) {
    const statusId = task?.statusId?._id || task?.statusId;
    const status = workflowStatuses.find(s => s._id === statusId);
    if (status) {
      return status.category === "Done";
    }
  }

  // Fallback if workflow isn't loaded
  const statusCategory = task?.statusId?.category?.toLowerCase() || "";
  const statusName = task?.statusId?.name?.toLowerCase() || "";
  const progress = Number(task?.progress || 0);
  return statusCategory === "done" || statusName.includes("done") || statusName.includes("complete") || progress === 100;
};


const PriorityIcon = ({ name, className }) => {
  if (!name) return null;
  const Icon = FaIcons[name] || FaIcons.FaQuestionCircle;
  return <Icon className={className} />;
};

const getUserTeamInfo = (userId, project) => {
  if (!project || !project.teams || !userId) return null;
  const uidStr = userId.toString();
  for (const team of project.teams) {
    if (team.leaderId) {
      const leaderIdStr = team.leaderId._id ? team.leaderId._id.toString() : team.leaderId.toString();
      if (leaderIdStr === uidStr) return { teamName: team.teamId?.name || team.name, role: "Leader" };
    }
    if (team.members) {
      for (const m of team.members) {
        const mStr = m._id ? m._id.toString() : m.toString();
        if (mStr === uidStr) return { teamName: team.teamId?.name || team.name, role: "Member" };
      }
    }
  }
  return null;
};

const ProjectDashboardPage = () => {
  const { projectKey } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [workflowStatuses, setWorkflowStatuses] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch project details (includes all tasks and members)
        const projectRes = await getProjectDetails(projectKey);
        const projectData = projectRes.data || projectRes;
        
        // Authorization check: Admin or PM
        let isAuthorized = false;
        if (user?.role === "admin") {
          isAuthorized = true;
        } else {
          const isPM = projectData?.members?.some(
            (m) => (m.userId?._id === user?._id || m.userId === user?._id) && m.role === "PROJECT_MANAGER"
          );
          isAuthorized = !!isPM;
        }

        if (!isAuthorized) {
          navigate(`/app/task-mgmt/projects/${projectKey}/backlog`);
          return;
        }

        setProject(projectData);

        // Fetch workflow
        try {
          const workflowData = await workflowService.getWorkflowByProject(projectKey);
          setWorkflowStatuses(workflowData?.statuses || []);
        } catch (wfErr) {
          console.error("Failed to load workflow", wfErr);
        }

        // Fetch all sprints
        const sprintsRes = await sprintService.getSprints(projectKey);
        // sprintService.getSprints returns { sprint: [...], tasksWithoutSprint: [...] }
        const sprintList = Array.isArray(sprintsRes) ? sprintsRes : sprintsRes?.sprint || [];
        
        if (sprintList && sprintList.length > 0) {
          setSprints(sprintList);
          // Default to the started sprint if one exists, otherwise the first one
          const active = sprintList.find(s => s.status === "started");
          setSelectedSprintId(active ? active._id : sprintList[0]._id);
        }

        // Fetch activity logs
        try {
          const logsRes = await getProjectAuditLogs(projectData._id, 1, 10);
          setActivityLogs(logsRes.data?.data || logsRes.data || []);
        } catch (logErr) {
          console.error("Failed to load activity logs", logErr);
        }

      } catch (err) {
        console.error("Error fetching project dashboard data:", err);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (user && projectKey) {
      fetchDashboardData();
    }
  }, [projectKey, user, navigate]);

  const selectedSprint = useMemo(() => {
    return sprints.find(s => s._id === selectedSprintId);
  }, [sprints, selectedSprintId]);

  const stats = useMemo(() => {
    const defaultStats = { total: 0, completed: 0, overdue: [], dueSoon: [], sprintTasks: [], blockers: [] };
    if (!project || !project.tasks) return defaultStats;
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter(t => isTaskDone(t, workflowStatuses));
    const incompleteTasks = project.tasks.filter((t) => !isTaskDone(t, workflowStatuses));

    const overdueTasks = incompleteTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now);
    const dueSoonTasks = incompleteTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= twoDaysFromNow
    );

    const sprintTasks = selectedSprint
      ? project.tasks.filter((t) => t.sprintId === selectedSprint._id || t.sprintId?._id === selectedSprint._id)
      : [];

    const blockersRaw = incompleteTasks.filter((t) => {
      const isCritical = t.priorityId?.level === 1 || t.priorityId?.level === 2;
      const isBug = t.taskTypeId?.name?.toLowerCase().includes("bug");
      return isCritical || isBug;
    });

    const taskMap = {};
    project.tasks.forEach(t => { taskMap[t._id.toString()] = t; });

    const blockersMap = new Map();
    blockersRaw.forEach(t => {
       let current = t;
       while (current && current.parentTaskId) {
          const typeName = current.taskTypeId?.name?.toLowerCase() || "";
          if (typeName === "epic" || typeName.includes("story")) {
             break;
          }
          const pId = current.parentTaskId._id?.toString() || current.parentTaskId.toString();
          if (!taskMap[pId] || taskMap[pId]._id.toString() === current._id.toString()) break;
          current = taskMap[pId];
       }
       blockersMap.set(current._id.toString(), current);
    });

    const blockers = Array.from(blockersMap.values());

    // Create a map for quick children lookup
    const childrenMap = {};
    project.tasks.forEach(t => {
      if (t.parentTaskId) {
        const parentId = t.parentTaskId._id?.toString() || t.parentTaskId.toString();
        if (!childrenMap[parentId]) childrenMap[parentId] = [];
        childrenMap[parentId].push(t);
      }
    });

    // Extract Epics and recalculate progress based on leaf descendants
    const epics = project.tasks.filter((t) => t.taskTypeId?.name?.toLowerCase() === "epic").map(epic => {
      const epicIdStr = epic._id?.toString();
      const leafTasks = [];
      const traverse = (taskId) => {
         const children = childrenMap[taskId] || [];
         children.forEach(child => {
            const subChildren = childrenMap[child._id.toString()];
            if (!subChildren || subChildren.length === 0) {
               leafTasks.push(child);
            } else {
               traverse(child._id.toString());
            }
         });
      };
      if (epicIdStr) traverse(epicIdStr);
      
      let doneCount = 0;
      leafTasks.forEach(child => {
         if (isTaskDone(child, workflowStatuses)) doneCount += 1;
      });
      
      const calcProgress = leafTasks.length > 0 ? Math.round((doneCount / leafTasks.length) * 100) : 0;
      return { ...epic, progress: calcProgress };
    });

    const sortByPriority = (tasksArr) => {
      return [...tasksArr].sort((a, b) => {
        const levelA = a.priorityId?.level ?? 999;
        const levelB = b.priorityId?.level ?? 999;
        return levelA - levelB;
      });
    };

    return {
      total: totalTasks,
      completed: completedTasks.length,
      epics: epics,
      overdue: sortByPriority(overdueTasks),
      dueSoon: sortByPriority(dueSoonTasks),
      sprintTasks: sortByPriority(sprintTasks),
      blockers: sortByPriority(blockers),
    };
  }, [project, selectedSprint, workflowStatuses]);

  const taskWorkload = useMemo(() => {
    if (!project || !project.tasks || project.tasks.length === 0) return [];
    
    // Calculate workload based on Standard Tasks (not Epics)
    const standardTasks = project.tasks.filter((t) => t.taskTypeId?.name?.toLowerCase() !== "epic");
    const assigneeMap = {};

    standardTasks.forEach((task) => {
      const assignee = task.assigneeId;
      if (!assignee) return;

      if (!assigneeMap[assignee._id]) {
        assigneeMap[assignee._id] = {
          user: assignee,
          total: 0,
          completed: 0,
          inProgress: 0,
          stories: 0,
          tasks: 0
        };
      }
      
      assigneeMap[assignee._id].total += 1;
      
      const typeName = task.taskTypeId?.name?.toLowerCase() || "task";
      if (typeName.includes("story")) {
        assigneeMap[assignee._id].stories += 1;
      } else {
        assigneeMap[assignee._id].tasks += 1;
      }
      if (isTaskDone(task, workflowStatuses)) {
        assigneeMap[assignee._id].completed += 1;
      } else {
        assigneeMap[assignee._id].inProgress += 1;
      }
    });

    return Object.values(assigneeMap).sort((a, b) => b.total - a.total);
  }, [project, workflowStatuses]);

  const { minEpicDate, maxEpicDate } = useMemo(() => {
    if (!stats.epics || stats.epics.length === 0) return { minEpicDate: new Date(), maxEpicDate: new Date() };
    let min = null;
    let max = null;
    stats.epics.forEach(e => {
      const start = e.startDate ? new Date(e.startDate) : new Date();
      const end = e.dueDate ? new Date(e.dueDate) : new Date();
      if (!min || start < min) min = start;
      if (!max || end > max) max = end;
    });
    
    // Add 7 days padding
    if (min) min = new Date(min.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (max) max = new Date(max.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return { minEpicDate: min || new Date(), maxEpicDate: max || new Date() };
  }, [stats.epics]);

  const totalTimelineDuration = maxEpicDate.getTime() - minEpicDate.getTime();

  const epicBreakdowns = useMemo(() => {
    if (!project || !project.tasks || !stats.epics || stats.epics.length === 0) return {};
    const breakdowns = {};
    
    // Create a map for quick children lookup
    const childrenMap = {};
    project.tasks.forEach(t => {
      if (t.parentTaskId) {
        const parentId = t.parentTaskId._id?.toString() || t.parentTaskId.toString();
        if (!childrenMap[parentId]) childrenMap[parentId] = [];
        childrenMap[parentId].push(t);
      }
    });

    stats.epics.forEach(epic => {
      const epicIdStr = epic._id?.toString();
      if (!epicIdStr) return;
      const stories = childrenMap[epicIdStr] || [];
      const teamProgress = {};

      stories.forEach(story => {
         const assignee = story.assigneeId;
         if (!assignee) return;
         
         if (!teamProgress[assignee._id]) {
            teamProgress[assignee._id] = { user: assignee, count: 0, done: 0, sumProgress: 0 };
         }
         
         const leafTasks = [];
         const traverseStory = (taskId) => {
            const children = childrenMap[taskId] || [];
            children.forEach(child => {
               const subChildren = childrenMap[child._id.toString()];
               if (!subChildren || subChildren.length === 0) {
                  leafTasks.push(child);
               } else {
                  traverseStory(child._id.toString());
               }
            });
         };
         traverseStory(story._id.toString());
         
         let storyProgress = 0;
         if (leafTasks.length > 0) {
            let doneLeaf = 0;
            leafTasks.forEach(leaf => {
               if (isTaskDone(leaf, workflowStatuses)) doneLeaf += 1;
            });
            storyProgress = (doneLeaf / leafTasks.length) * 100;
         } else {
            if (isTaskDone(story, workflowStatuses)) {
               storyProgress = 100;
            } else {
               storyProgress = story.progress || 0;
            }
         }
         
         teamProgress[assignee._id].count += 1;
         teamProgress[assignee._id].sumProgress += storyProgress;
         if (storyProgress === 100) {
            teamProgress[assignee._id].done += 1;
         }
      });
      
      breakdowns[epic._id] = Object.values(teamProgress).map(t => ({
        user: t.user,
        progress: t.count > 0 ? Math.round(t.sumProgress / t.count) : 0,
        count: t.count,
        done: t.done
      })).sort((a,b) => b.count - a.count);
    });
    
    return breakdowns;
  }, [project, stats.epics, workflowStatuses]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" text="Loading Project Dashboard..." />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8">
        <EmptyState icon="error" title="Access Denied" description={error || "You do not have permission to view this page."} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-neutral-50">
      <PageHeader
        title={`Dashboard: ${project.name}`}
        subtitle="Comprehensive project overview for Admin & Project Manager"
        badge={project.status}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-600">
              Progress: {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
            </span>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white">
            <div className="p-4">
              <div className="text-sm font-medium text-neutral-500">Total Tasks</div>
              <div className="text-2xl font-bold text-neutral-900 mt-1">{stats.total}</div>
            </div>
          </Card>
          <Card className="bg-white">
            <div className="p-4">
              <div className="text-sm font-medium text-neutral-500">Completed</div>
              <div className="text-2xl font-bold text-success-600 mt-1">{stats.completed}</div>
            </div>
          </Card>
          <Card className="bg-white">
            <div className="p-4">
              <div className="text-sm font-medium text-neutral-500">Total Epics</div>
              <div className="text-2xl font-bold text-neutral-900 mt-1">{stats.epics.length}</div>
            </div>
          </Card>
          <Card className="bg-white">
            <div className="p-4">
              <div className="text-sm font-medium text-neutral-500">Completed Epics</div>
              <div className="text-2xl font-bold text-success-600 mt-1">{stats.epics.filter(e => e.progress === 100 || isTaskDone(e, workflowStatuses)).length}</div>
            </div>
          </Card>
        </div>

        {/* Blockers & Severe Bugs (Full Width) */}
        {stats.blockers.length > 0 && (
          <div className="mb-6">
            <Card
              header={
                <h3 className="font-bold text-lg text-danger-600 flex items-center gap-2">
                  <span className="material-symbols-outlined text-danger-600">block</span>
                  Blockers & Severe Bugs
                </h3>
              }
            >
              <div className="space-y-4">
                {stats.blockers.map((task) => (
                  <div key={`blocker-${task._id}`} className="flex items-center justify-between p-4 rounded-lg bg-danger-50 border border-danger-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="danger">Blocker / Critical</Badge>
                        {task.priorityId && (
                          <div className="flex items-center gap-1 text-xs text-neutral-500 border border-neutral-200 rounded px-1 py-0.5 bg-white">
                            {task.priorityId.icon && (
                              <PriorityIcon name={task.priorityId.icon} />
                            )}
                            <span>{task.priorityId.name}</span>
                          </div>
                        )}
                      </div>
                      <Link to={`/app/task/${task.key}`} className="font-bold text-danger-700 hover:text-danger-800 hover:underline block text-base">
                        {task.key} - {task.name}
                      </Link>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="text-sm font-semibold text-neutral-800">
                        {task.assigneeId?.fullname ? task.assigneeId.fullname : "Unassigned"}
                      </div>
                      {task.assigneeId && (() => {
                        const info = getUserTeamInfo(task.assigneeId._id || task.assigneeId, project);
                        if (info) return (
                          <div className="text-xs font-bold px-2 py-1 bg-white rounded border border-neutral-200 mt-1.5 text-neutral-600">
                            {info.role === "Leader" ? "👑 Leader" : "Member"} - <span className="text-primary-700">{info.teamName}</span>
                          </div>
                        );
                        return null;
                      })()}
                      {task.dueDate && (
                        <div className={`text-xs mt-1 ${new Date(task.dueDate) < new Date() ? "text-accent-600 font-bold" : "text-neutral-500"}`}>
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Roadmap / Gantt Chart View */}
            <Card
              header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="font-bold text-lg text-neutral-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary-600">view_timeline</span>
                    Epic Roadmap
                  </h3>
                </div>
              }
            >
              {stats.epics.length === 0 ? (
                <EmptyState icon="map" title="No Epics Found" description="Create Epics to view the project roadmap." />
              ) : (
                <div className="overflow-x-auto pb-4">
                  <div className="min-w-[600px]">
                    {/* Header: Months (simplified) */}
                    <div className="flex border-b border-neutral-200 pb-2 mb-4 text-xs text-neutral-500 relative h-6">
                      <div className="absolute left-0">Start</div>
                      <div className="absolute right-0">End</div>
                    </div>
                    {/* Timeline rows */}
                    <div className="space-y-4">
                      {stats.epics.map(epic => {
                        const epicStart = epic.startDate ? new Date(epic.startDate) : new Date();
                        const epicEnd = epic.dueDate ? new Date(epic.dueDate) : new Date();
                        
                        let leftPercent = ((epicStart.getTime() - minEpicDate.getTime()) / totalTimelineDuration) * 100;
                        let widthPercent = ((epicEnd.getTime() - epicStart.getTime()) / totalTimelineDuration) * 100;
                        
                        if (leftPercent < 0) leftPercent = 0;
                        if (widthPercent < 2) widthPercent = 2; // min width
                        if (leftPercent + widthPercent > 100) widthPercent = 100 - leftPercent;

                        return (
                          <div key={epic._id} className="relative h-12 flex items-center group">
                            <div className="w-48 shrink-0 pr-4 truncate flex items-center gap-2">
                              <span className="text-xs font-semibold text-primary-600">{epic.key}</span>
                              <Link to={`/app/task/${epic.key}`} className="text-sm font-medium text-neutral-800 hover:text-primary-600 truncate block">
                                {epic.name}
                              </Link>
                            </div>
                            <div className="flex-1 relative h-full flex items-center bg-neutral-50 rounded border border-neutral-100">
                              {/* The Bar */}
                              <div 
                                className="absolute h-8 bg-primary-100 border border-primary-300 rounded-md shadow-sm overflow-hidden group-hover:shadow hover:bg-primary-200 transition-all cursor-pointer"
                                style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                                title={`${epic.name}\nStart: ${epicStart.toLocaleDateString()}\nEnd: ${epicEnd.toLocaleDateString()}`}
                                onClick={() => navigate(`/app/task/${epic.key}`)}
                              >
                                <div 
                                  className="h-full bg-primary-500 opacity-80"
                                  style={{ width: `${epic.progress || 0}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Progress by Epic */}
            <Card
              header={
                <h3 className="font-bold text-lg text-neutral-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-success-600">donut_large</span>
                  Progress by Epic
                </h3>
              }
            >
              {stats.epics.length === 0 ? (
                <EmptyState icon="task" title="No Epics" description="No epics exist to show progress." />
              ) : (
                <div className="space-y-5">
                  {stats.epics.map((epic) => {
                    const breakdown = epicBreakdowns[epic._id] || [];
                    return (
                      <div key={epic._id} className="flex flex-col gap-3 p-4 rounded-lg border border-neutral-200 bg-white shadow-sm">
                        <div className="flex justify-between items-center">
                          <Link to={`/app/task/${epic.key}`} className="font-medium text-neutral-900 hover:text-primary-600 flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-primary-50 text-primary-700 border border-primary-200 font-semibold">{epic.key}</span>
                            {epic.name}
                          </Link>
                          <span className={`text-sm font-bold px-2 py-1 rounded-md ${epic.progress === 100 ? "bg-success-100 text-success-700" : "bg-neutral-100 text-neutral-700"}`}>{epic.progress || 0}%</span>
                        </div>
                        <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden mb-1">
                          <div 
                            className={`h-full transition-all duration-500 ${(epic.progress || 0) === 100 ? 'bg-success-500' : 'bg-primary-500'}`} 
                            style={{ width: `${epic.progress || 0}%` }}
                          ></div>
                        </div>

                        {/* Breakdown by team/leader */}
                        {breakdown.length > 0 && (
                          <div className="mt-2 pt-3 border-t border-dashed border-neutral-200 space-y-3">
                            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Involved Teams/Leaders</div>
                            {breakdown.map(team => (
                              <div key={team.user._id} className="flex items-center justify-between gap-3 text-sm">
                                <div className="flex items-center gap-2 w-40 shrink-0 truncate">
                                  <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-[10px] font-bold overflow-hidden shrink-0">
                                    {team.user.avatar ? (
                                      <img src={team.user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                      team.user.fullname?.charAt(0) || "?"
                                    )}
                                  </div>
                                  <div className="flex flex-col truncate">
                                    <span className="text-neutral-700 truncate text-xs font-medium leading-tight" title={team.user.fullname}>{team.user.fullname}</span>
                                    {(() => {
                                      const info = getUserTeamInfo(team.user._id, project);
                                      if (info) return <span className="text-[10px] text-neutral-500 truncate leading-tight mt-0.5">{info.role === "Leader" ? "👑 Leader" : "Member"} - {info.teamName}</span>;
                                      return null;
                                    })()}
                                  </div>
                                </div>
                                <div className="flex-1 flex items-center gap-2">
                                  <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-500 ${team.progress === 100 ? 'bg-success-500' : 'bg-primary-500'}`} 
                                      style={{ width: `${team.progress}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-[10px] font-medium text-neutral-500 w-8 text-right shrink-0">{team.progress}%</span>
                                </div>
                                <div className="text-[10px] text-neutral-400 w-16 text-right shrink-0">
                                  {team.done}/{team.count} done
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {breakdown.length === 0 && (
                          <div className="text-xs text-neutral-400 italic mt-1">No tasks assigned yet.</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Resource Management */}
          <div className="space-y-6">
            <Card
              header={
                <h3 className="font-bold text-lg text-neutral-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500">manage_accounts</span>
                  Resource Management (Task Workload)
                </h3>
              }
            >
              {taskWorkload.length === 0 ? (
                <EmptyState icon="person_off" title="No Assignments" description="No tasks are currently assigned to members." />
              ) : (
                <div className="space-y-4">
                  {taskWorkload.map((wl) => (
                    <div key={wl.user._id} className="p-3 rounded-lg border border-neutral-200 bg-white">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-bold overflow-hidden shrink-0">
                          {wl.user.avatar ? (
                            <img src={wl.user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            wl.user.fullname?.charAt(0) || "?"
                          )}
                        </div>
                        <div className="flex-1 truncate">
                          <div className="text-sm font-semibold text-neutral-900 truncate">{wl.user.fullname}</div>
                          <div className="text-xs text-neutral-500">
                            {wl.stories > 0 && <span className="mr-2"><span className="font-medium text-primary-600">{wl.stories}</span> Stories</span>}
                            {wl.tasks > 0 && <span><span className="font-medium text-primary-600">{wl.tasks}</span> Tasks</span>}
                            {wl.stories === 0 && wl.tasks === 0 && `${wl.total} Assignments`}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex h-2 w-full rounded-full overflow-hidden bg-neutral-100 mt-2">
                        <div 
                          className="bg-success-500" 
                          style={{ width: `${(wl.completed / wl.total) * 100}%` }}
                          title={`${wl.completed} Completed`}
                        ></div>
                        <div 
                          className="bg-primary-500" 
                          style={{ width: `${(wl.inProgress / wl.total) * 100}%` }}
                          title={`${wl.inProgress} In Progress`}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-neutral-500 mt-1 px-1">
                        <span>{wl.completed} done</span>
                        <span>{wl.inProgress} in progress</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Activity Stream */}
            <Card
              header={
                <h3 className="font-bold text-lg text-neutral-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-600">history</span>
                  Recent Activity
                </h3>
              }
            >
              {activityLogs.length === 0 ? (
                <EmptyState icon="history" title="No Activity" description="No recent activity recorded." />
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {activityLogs.map((log) => (
                    <div key={log._id} className="flex gap-3 text-sm border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex-shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-neutral-400 text-[18px]">
                          {log.action === "CREATE" ? "add_circle" : log.action === "UPDATE" ? "edit" : log.action === "DELETE" ? "delete" : "info"}
                        </span>
                      </div>
                      <div>
                        <p className="text-neutral-800 leading-snug">
                          <span className="font-semibold text-neutral-900">{log.userId?.fullname || "System"}</span> {log.action.toLowerCase()} <span className="font-medium">{log.recordName || log.tableName}</span>
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-1">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDashboardPage;
