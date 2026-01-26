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

  // Fetch project details to get type
  const fetchProjectDetails = async () => {
    try {
      const response = await getProjectByKey(selectedProjectKey);
      setProjectType(response.data.type);
      setProjectData(response.data);

      // Xác định vai trò của user trong project (ưu tiên: admin > PM > LEADER > MEMBER)
      let role = null;
      const userId = user._id;
      if (user.role === "admin") {
        role = "ADMIN";
      } else {
        // Check PM
        const member = response.data.members?.find((m) => {
          const memId = m.userId?._id || m.userId;
          return memId === userId;
        });
        if (member && member.role === "PROJECT_MANAGER") {
          role = "PROJECT_MANAGER";
        } else {
          // Check LEADER trong các team
          const isLeader = (response.data.teams || []).some((team) => {
            const leaderId = team.leaderId?._id || team.leaderId;
            return leaderId === userId;
          });
          if (isLeader) {
            role = "LEADER";
          } else {
            // Check là member trong bất kỳ team nào
            const isTeamMember = (response.data.teams || []).some((team) =>
              (team.members || []).some((m) => {
                const memId = m?._id || m;
                return memId === userId;
              }),
            );
            if (isTeamMember) {
              role = "MEMBER";
            } else {
              role = null;
            }
          }
        }
      }
      console.log("Determined user project role:", role);
      setUserProjectRole(role);
    } catch (error) {
      console.error("Error fetching project details:", error);
    }
  };

  const fetchSprintList = async () => {
    try {
      const data = await sprintService.getSprints(selectedProjectKey);
      setSprintList(data.sprint);
      setTaskList(data.tasksWithoutSprint);
    } catch (error) {
      console.error("Error fetching sprint list:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSprint = async () => {
    try {
      await sprintService.createSprint(selectedProjectKey);
      fetchSprintList();
    } catch (error) {
      console.error("Error creating sprint:", error);
    }
  };

  const handleDrop = async (draggedItem, target) => {
    const { task, source } = draggedItem;
    console.log(`Dropped task: ${task.name} from ${source} to ${target}`);

    // Check if target sprint is completed
    if (target !== "backlog") {
      const targetSprint = sprintList.find((s) => s._id === target);
      if (targetSprint && targetSprint.status === "Completed") {
        toast.error("Cannot add tasks to a completed sprint.");
        return;
      }
    }

    // Validate task dates against sprint dates if moving to a sprint
    if (target !== "backlog" && task.startDate && task.dueDate) {
      const targetSprint = sprintList.find((s) => s._id === target);
      // Nếu sprint không có ngày bắt đầu hoặc kết thúc thì bỏ qua validate
      if (targetSprint && targetSprint.startDate && targetSprint.endDate) {
        const taskStart = new Date(task.startDate).setHours(0, 0, 0, 0);
        const taskEnd = new Date(task.dueDate).setHours(0, 0, 0, 0);

        const sprintStart = new Date(targetSprint.startDate).setHours(0, 0, 0, 0);
        const sprintEnd = new Date(targetSprint.endDate).setHours(0, 0, 0, 0);

        if (taskStart < sprintStart || taskEnd > sprintEnd) {
          toast.error(
            `Task dates (${new Date(task.startDate).toLocaleDateString()} - ${new Date(
              task.dueDate,
            ).toLocaleDateString()}) must be within sprint dates (${new Date(targetSprint.startDate).toLocaleDateString()} - ${new Date(
              targetSprint.endDate,
            ).toLocaleDateString()})`,
          );
          return;
        }
      }
    }

    try {
      await updateTaskSprint(selectedProjectKey, task._id, target === "backlog" ? null : target);
      fetchSprintList();
    } catch (error) {
      const msg = error?.response?.data?.message || "Có lỗi xảy ra khi cập nhật sprint cho task!";
      toast.error(msg);
      console.error("Error updating task sprint:", error);
    }
  };

  const handleEditSprint = (sprint) => {
    setSprintToEdit(sprint);
    setEditModalOpen(true);
  };

  const handleSaveEditSprint = async (form) => {
    try {
      await sprintService.updateSprint(sprintToEdit._id, form);
      setEditModalOpen(false);
      setSprintToEdit(null);
      fetchSprintList();
    } catch (error) {
      console.error("Error updating sprint:", error);
    }
  };

  const handleStartSprint = async (sprint) => {
    try {
      if (!sprint.tasks || sprint.tasks.length === 0) {
        toast.error("Cannot start a sprint with no tasks.");
        return;
      }
      await sprintService.updateSprint(sprint._id, { status: "Started" });
      toast.success("Sprint started successfully!");

      // Navigate to active sprint page with sprint ID
      navigate(`/app/task-mgmt/projects/${selectedProjectKey}/active-sprint?sprint=${sprint._id}`);
    } catch (error) {
      console.error("Error starting sprint:", error);
    }
  };

  const handleSprintNameClick = (sprint) => {
    if (sprint.status === "Started") {
      navigate(`/app/task-mgmt/projects/${selectedProjectKey}/active-sprint?sprint=${sprint._id}`);
    }
  };

  const handleCompleteSprint = async (sprint) => {
    try {
      await sprintService.updateSprint(sprint._id, { status: "Completed" });
      fetchSprintList();
    } catch (error) {
      console.error("Error completing sprint:", error);
    }
  };

  const handleDeleteSprint = (sprint) => {
    setSprintToDelete(sprint);
    setShowDeleteModal(true);
  };

  const confirmDeleteSprint = async () => {
    if (sprintToDelete) {
      try {
        await sprintService.deleteSprint(sprintToDelete._id);
        toast.success("Sprint deleted successfully!");
        await fetchSprintList();
        setShowDeleteModal(false);
        setSprintToDelete(null);
      } catch (error) {
        console.error("Error deleting sprint:", error);
        toast.error(error.response?.data?.message || "Failed to delete sprint");
      }
    }
  };

  const handleBacklogTaskCreated = (newTask) => {
    setTaskList((prev) => [...prev, newTask]);
    setIsCreateTaskModalOpen(false);
  };

  const handleTaskClick = (task) => {
    navigate(`/app/task/${task.key}`);
  };

  useEffect(() => {
    if (selectedProjectKey) {
      fetchProjectDetails();
      fetchSprintList();
    }
  }, [selectedProjectKey]);

  // Permission checks
  const isProjectCompleted = projectData?.status === "completed";
  const canManageSprints = !isProjectCompleted && (user?.role === "admin" || userProjectRole === "PROJECT_MANAGER");
  const canCreateTask = !isProjectCompleted && (user?.role === "admin" || userProjectRole === "PROJECT_MANAGER" || userProjectRole === "LEADER");
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
              <Button onClick={handleCreateSprint} icon="add" iconPosition="left">
                Create Sprint
              </Button>
            ) : null
          }
        />

        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <SprintList
                sprintList={sprintList}
                onDrop={handleDrop}
                onEdit={handleEditSprint}
                onStart={handleStartSprint}
                onComplete={handleCompleteSprint}
                onDelete={handleDeleteSprint}
                onSprintNameClick={handleSprintNameClick}
                onTaskClick={handleTaskClick}
                projectType={projectType}
                canManageSprints={canManageSprints}
                canCreateTask={canCreateTask}
                canDragDrop={canDragDrop}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-neutral-200">
                <h2 className="text-xl font-semibold text-neutral-900">Backlog</h2>
                <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">{taskList.length}</span>
              </div>
              <TaskList tasks={taskList} source="backlog" onDrop={handleDrop} canDragDrop={canDragDrop} onTaskClick={handleTaskClick} />
              {canCreateTask && (
                <Button variant="secondary" onClick={() => setIsCreateTaskModalOpen(true)} icon="add" iconPosition="left">
                  Create Task
                </Button>
              )}
            </div>
          </div>
        </div>

        <ConfirmationModal
          isOpen={showDeleteModal}
          title="Confirm Delete"
          message={`Are you sure you want to delete sprint "${sprintToDelete?.name}"?`}
          onConfirm={confirmDeleteSprint}
          onClose={() => {
            setShowDeleteModal(false);
            setSprintToDelete(null);
          }}
        />
        <SprintEditModal
          isOpen={editModalOpen}
          sprint={sprintToEdit}
          project={projectData}
          onClose={() => {
            setEditModalOpen(false);
            setSprintToEdit(null);
          }}
          onSave={handleSaveEditSprint}
        />
        <CreateTaskModal
          isOpen={isCreateTaskModalOpen}
          onClose={() => setIsCreateTaskModalOpen(false)}
          onTaskCreated={handleBacklogTaskCreated}
          defaultProjectId={projectData?._id}
        />
      </div>
    </DndProvider>
  );
};

export default BacklogPage;
