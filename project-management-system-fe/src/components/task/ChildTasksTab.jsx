import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { searchTasks } from "../../services/taskService";
import { toast } from "react-toastify";
import LoadingSpinner from "../ui/LoadingSpinner";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";
import CreateTaskModal from "./CreateTaskModal";

const ChildTasksTab = ({ parentTask }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchChildTasks = async () => {
    try {
      setLoading(true);
      // Fetch child tasks by parentTaskId
      const res = await searchTasks({ projectId: parentTask.projectId?._id || parentTask.projectId, keyword: "" });
      const allTasks = res.data || [];
      const childTasks = allTasks.filter(t => {
        const parentId = t.parentTaskId?._id?.toString() || t.parentTaskId?.toString();
        return parentId === parentTask._id.toString();
      });
      setTasks(childTasks);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch child tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildTasks();
  }, [parentTask._id]);

  const handleTaskCreated = () => {
    setIsCreateModalOpen(false);
    fetchChildTasks();
  };

  const isEpic = parentTask.taskTypeId?.name?.toLowerCase()?.includes("epic");
  const childTypeStr = isEpic ? "Story" : "Task";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">Child {childTypeStr}s</h3>
        <Button size="sm" onClick={() => setIsCreateModalOpen(true)} variant="secondary">
          Create {childTypeStr}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <LoadingSpinner size="md" text="Loading tasks..." />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState icon="account_tree" title={`No child ${childTypeStr.toLowerCase()}s`} description="Click the button above to create one." />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task._id} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg bg-white hover:border-primary-300 transition-colors">
              <div className="flex flex-col">
                <Link to={`/app/task/${task.key}`} className="font-semibold text-primary-600 hover:text-primary-700 hover:underline text-sm flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 border border-primary-200 font-bold">{task.key}</span>
                  {task.name}
                </Link>
                <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                  <span className={`px-2 py-0.5 rounded font-medium border ${task.statusId?.category === "Done" ? "bg-success-50 border-success-200 text-success-700" : "bg-neutral-50 border-neutral-200 text-neutral-700"}`}>
                    {task.statusId?.name || "Unknown"}
                  </span>
                  {task.assigneeId ? (
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold overflow-hidden shrink-0">
                        {task.assigneeId.avatar ? (
                          <img src={task.assigneeId.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          task.assigneeId.fullname?.charAt(0) || "?"
                        )}
                      </div>
                      <span className="truncate max-w-[100px]">{task.assigneeId.fullname}</span>
                    </div>
                  ) : (
                    <span>Unassigned</span>
                  )}
                  {task.taskTypeId && (
                    <span className="flex items-center gap-1">
                      <i className={task.taskTypeId.icon}></i>
                      {task.taskTypeId.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isCreateModalOpen && (
        <CreateTaskModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onTaskCreated={handleTaskCreated}
          defaultProjectId={parentTask.projectId?._id || parentTask.projectId}
          initialParentTaskId={parentTask._id}
        />
      )}
    </div>
  );
};

export default ChildTasksTab;
