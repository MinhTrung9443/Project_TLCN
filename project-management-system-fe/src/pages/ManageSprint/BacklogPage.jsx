import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import SprintList from "../../components/sprint/sprintList";
import TaskList from "../../components/sprint/taskItem";
import sprintService from "../../services/sprintService";
import { updateTaskSprint } from "../../services/taskService";
import { ProjectContext } from "../../contexts/ProjectContext";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import SprintEditModal from "../../components/sprint/SprintEditModal";
import CreateTaskModal from "../../components/task/CreateTaskModal";
import { getProjectByKey } from "../../services/projectService";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { VscRepo } from "react-icons/vsc";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";

const BacklogPage = () => {
  const { selectedProjectKey } = useContext(ProjectContext);
  const [sprintList, setSprintList] = useState([]);
  const [taskList, setTaskList] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sprintToDelete, setSprintToDelete] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [sprintToEdit, setSprintToEdit] = useState(null);
  const [projectType, setProjectType] = useState(null);
  const [userProjectRole, setUserProjectRole] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchProjectDetails = async () => {
    const res = await getProjectByKey(selectedProjectKey);
    setProjectType(res.data.type);
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
  };

  const fetchSprintList = async () => {
    const data = await sprintService.getSprints(selectedProjectKey);
    setSprintList(data.sprint);
    setTaskList(data.tasksWithoutSprint);
    setLoading(false);
  };

  const [creatingSprint, setCreatingSprint] = useState(false);

  const handleCreateSprint = async () => {
    if (!selectedProjectKey) return;
    try {
      setCreatingSprint(true);
      await sprintService.createSprint(selectedProjectKey);
      toast.success("Sprint created.");
      await fetchSprintList();
    } catch (error) {
      toast.error("Failed to create sprint.");
    } finally {
      setCreatingSprint(false);
    }
  };

  const handleEditSprint = (sprint) => {
    setSprintToEdit(sprint);
    setEditModalOpen(true);
  };

  const handleStartSprint = async (sprint) => {
    try {
      await sprintService.updateSprint(sprint._id, { status: "Started" });
      toast.success("Sprint started.");
      fetchSprintList();
    } catch (error) {
      toast.error("Failed to start sprint.");
    }
  };

  const handleCompleteSprint = async (sprint) => {
    try {
      await sprintService.updateSprint(sprint._id, { status: "Completed" });
      toast.success("Sprint completed.");
      fetchSprintList();
    } catch (error) {
      toast.error("Failed to complete sprint.");
    }
  };

  const handleRequestDeleteSprint = (sprint) => {
    setSprintToDelete(sprint);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteSprint = async () => {
    if (!sprintToDelete) return;
    try {
      await sprintService.deleteSprint(sprintToDelete._id);
      toast.success("Sprint deleted.");
      setShowDeleteModal(false);
      setSprintToDelete(null);
      fetchSprintList();
    } catch (error) {
      toast.error("Failed to delete sprint.");
    }
  };

  const handleDrop = async (draggedItem, target) => {
    const { task } = draggedItem;

    if (target !== "backlog") {
      const sprint = sprintList.find((s) => s._id === target);
      if (sprint?.status === "Completed") {
        toast.error("Cannot add tasks to a completed sprint.");
        return;
      }
    }

    await updateTaskSprint(selectedProjectKey, task._id, target === "backlog" ? null : target);
    fetchSprintList();
  };

  useEffect(() => {
    if (selectedProjectKey) {
      fetchProjectDetails();
      fetchSprintList();
    }
  }, [selectedProjectKey]);

  const isProjectCompleted = projectData?.status === "completed";
  const canManageSprints = !isProjectCompleted && (user?.role === "admin" || userProjectRole === "PROJECT_MANAGER");
  const canCreateTask = !isProjectCompleted && ["admin", "PROJECT_MANAGER", "LEADER"].includes(user?.role || userProjectRole);
  const canDragDrop = !isProjectCompleted && canManageSprints;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading sprint data..." />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-neutral-50">
        <PageHeader
          icon={VscRepo}
          title="Backlog & Sprints"
          description="Plan and organize your project tasks"
          actions={
            canManageSprints && projectType !== "Kanban" ? (
              <Button onClick={handleCreateSprint} disabled={creatingSprint}>
                {creatingSprint ? "Creating..." : "Create Sprint"}
              </Button>
            ) : null
          }
        />

        <div className="max-w-7xl mx-auto p-6">
          <div className="relative flex gap-6 pr-[26rem]">
            <div className="flex-1 max-w-5xl space-y-4">
              <SprintList
                sprintList={sprintList}
                onDrop={handleDrop}
                onEdit={handleEditSprint}
                onStart={handleStartSprint}
                onComplete={handleCompleteSprint}
                onDelete={handleRequestDeleteSprint}
                onSprintNameClick={() => {}}
                onTaskClick={(t) => navigate(`/app/task/${t.key}`)}
                projectType={projectType}
                canManageSprints={canManageSprints}
                canCreateTask={canCreateTask}
                canDragDrop={canDragDrop}
              />
            </div>

            <aside className="w-96 fixed right-6 top-45 h-[65vh] shrink-0 z-30">
              <div className="h-full flex flex-col bg-white border border-neutral-200 rounded-lg">
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="text-lg font-semibold">Backlog</h2>
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">{taskList.length}</span>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                  <TaskList
                    tasks={taskList}
                    source="backlog"
                    onDrop={handleDrop}
                    canDragDrop={canDragDrop}
                    onTaskClick={(t) => navigate(`/app/task/${t.key}`)}
                  />
                </div>

                {canCreateTask && (
                  <div className="p-3 border-t">
                    <Button variant="secondary" className="w-full" onClick={() => setIsCreateTaskModalOpen(true)}>
                      Create Task
                    </Button>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>

        <ConfirmationModal
          isOpen={showDeleteModal}
          title="Confirm Delete"
          message={`Are you sure you want to delete sprint "${sprintToDelete?.name}"?`}
          onConfirm={handleConfirmDeleteSprint}
          onClose={() => setShowDeleteModal(false)}
        />

        <SprintEditModal
          isOpen={editModalOpen}
          sprint={sprintToEdit}
          project={projectData}
          onClose={() => setEditModalOpen(false)}
          onSave={() => {}}
        />

        <CreateTaskModal
          isOpen={isCreateTaskModalOpen}
          onClose={() => setIsCreateTaskModalOpen(false)}
          onTaskCreated={(t) => setTaskList((p) => [...p, t])}
          defaultProjectId={projectData?._id}
        />
      </div>
    </DndProvider>
  );
};

export default BacklogPage;
