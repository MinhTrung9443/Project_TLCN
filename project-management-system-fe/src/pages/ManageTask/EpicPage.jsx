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

const EpicPage = () => {
  const { projectKey } = useParams();
  const { user } = useAuth();
  const { selectedProjectKey } = useContext(ProjectContext);
  
  const [projectData, setProjectData] = useState(null);
  const [userProjectRole, setUserProjectRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [epicsList, setEpicsList] = useState([]);
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
                  <TableHead>Key</TableHead>
                  <TableHead>Epic Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {epicsList.map(epic => (
                  <TableRow key={epic._id} onClick={() => setSelectedEpic(epic)} className="cursor-pointer">
                    <TableCell>
                      <span className="text-xs px-2 py-0.5 rounded bg-primary-50 text-primary-700 border border-primary-200 font-semibold">{epic.key}</span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-neutral-900">{epic.name}</div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-neutral-100 rounded text-xs">{epic.statusId?.name || "Unknown"}</span>
                    </TableCell>
                    <TableCell>
                      {epic.assigneeId ? (
                        <div className="flex items-center gap-2">
                          {epic.assigneeId.avatar ? (
                            <img src={epic.assigneeId.avatar} className="w-5 h-5 rounded-full" alt="Avatar"/>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-[10px] text-primary-700 font-bold">{epic.assigneeId.fullname?.charAt(0)}</div>
                          )}
                          <span className="text-sm">{epic.assigneeId.fullname}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-neutral-500">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 w-32">
                        <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500" style={{width: `${epic.progress || 0}%`}}></div>
                        </div>
                        <span className="text-xs font-medium text-neutral-600">{epic.progress || 0}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
