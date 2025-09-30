import { useState, useContext, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import SprintList from "../../components/sprint/sprintList";
import TaskList from "../../components/sprint/taskItem";
import sprintService from "../../services/sprintService";
import { ProjectContext } from "../../contexts/ProjectContext";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import SprintEditModal from "../../components/sprint/SprintEditModal";
import "../../styles/pages/ManageSprint/BacklogPage.css";
import { toast } from "react-toastify";

const BacklogPage = () => {
  const { selectedProjectKey, setSelectedProjectKey } = useContext(ProjectContext);
  const [sprintList, setSprintList] = useState([]);
  const [taskList, setTaskList] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sprintToDelete, setSprintToDelete] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [sprintToEdit, setSprintToEdit] = useState(null);

  const fetchSprintList = async () => {
    try {
      const data = await sprintService.getSprints(selectedProjectKey);
      setSprintList(data.sprint);
      setTaskList(data.tasksWithoutSprint);
    } catch (error) {
      console.error("Error fetching sprint list:", error);
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
    if (source === target) return;
    // Cập nhật UI tạm thời
    if (source === "backlog") setTaskList((prev) => prev.filter((t) => t.id !== task.id));
    else setSprintList((prev) => prev.map((s) => (s._id === source ? { ...s, tasks: s.tasks.filter((t) => t.id !== task.id) } : s)));
    if (target === "backlog") setTaskList((prev) => [...prev, task]);
    else setSprintList((prev) => prev.map((s) => (s._id === target ? { ...s, tasks: [...s.tasks, task] } : s)));
    // Gọi API
    try {
      await sprintService.updateTaskSprint(task.id, target === "backlog" ? null : target);
    } catch (error) {
      console.error("Error updating task sprint:", error);
      fetchSprintList();
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
      fetchSprintList();
    } catch (error) {
      console.error("Error starting sprint:", error);
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
        fetchSprintList();
        setShowDeleteModal(false);
        setSprintToDelete(null);
      } catch (error) {
        console.error("Error deleting sprint:", error);
      }
    }
  };

  useEffect(() => {
    if (selectedProjectKey) {
      fetchSprintList();
    }
  }, [selectedProjectKey]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="backlogpage-container">
        <div className="backlogpage-header">
          <h2 className="backlogpage-title">Backlog & Sprints</h2>
          <button className="backlogpage-create-btn" onClick={handleCreateSprint}>
            + Create Sprint
          </button>
        </div>
        <div className="backlogpage-content">
          <div className="backlogpage-sprint-list">
            <SprintList
              sprintList={sprintList}
              onDrop={handleDrop}
              onEdit={handleEditSprint}
              onStart={handleStartSprint}
              onComplete={handleCompleteSprint}
              onDelete={handleDeleteSprint}
            />
          </div>
          {/* Backlog section moved below */}
        </div>
        <div className="backlogpage-backlog-section backlogpage-backlog-section-full">
          <div className="backlogpage-backlog-header">
            <span className="backlogpage-backlog-title">Backlog</span>
            <span className="backlogpage-backlog-count">{taskList.length}</span>
          </div>
          <TaskList tasks={taskList} source="backlog" onDrop={handleDrop} />
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
          onClose={() => {
            setEditModalOpen(false);
            setSprintToEdit(null);
          }}
          onSave={handleSaveEditSprint}
        />
      </div>
    </DndProvider>
  );
};

export default BacklogPage;
