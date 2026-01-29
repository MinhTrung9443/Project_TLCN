import React, { useState, useContext, useEffect, useMemo } from "react";
import { ProjectContext } from "../../contexts/ProjectContext";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "react-toastify";
import { getProjectDetails } from "../../services/projectService";
import { createMeeting } from "../../services/meetingService";
import InputField from "../common/InputField";
import Avatar from "../common/Avatar";

const CreateMeetingModal = ({ isOpen, onClose, onMeetingCreated }) => {
  const { projectData } = useContext(ProjectContext);
  const { user } = useAuth();
  const [detailedProjectData, setDetailedProjectData] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [scope, setScope] = useState("project"); // project, team, task
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [members, setMembers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && projectData?.key) {
      getProjectDetails(projectData.key)
        .then((res) => {
          setDetailedProjectData(res.data);
        })
        .catch((err) => {
          toast.error("Failed to fetch project details.");
        });
    }
  }, [isOpen, projectData?.key]);

  const tasks = useMemo(() => detailedProjectData?.tasks || [], [detailedProjectData]);

  const projectMembers = useMemo(() => {
    if (!detailedProjectData) return [];
    const memberMap = new Map();

    detailedProjectData.members?.forEach((m) => {
      if (m.userId) memberMap.set(m.userId._id, m.userId);
    });

    detailedProjectData.teams?.forEach((t) => {
      if (t.leaderId) memberMap.set(t.leaderId._id, t.leaderId);
      t.members?.forEach((m) => {
        memberMap.set(m._id, m);
      });
    });
    const currentUserId = user?._id?.toString();
    return Array.from(memberMap.values()).filter((member) => member?._id?.toString() !== currentUserId);
  }, [detailedProjectData, user?._id]);

  useEffect(() => {
    let initialMembers = [];
    if (!detailedProjectData) return;

    if (scope === "project") {
      initialMembers = projectMembers;
    } else if (scope === "team" && selectedTeam) {
      const team = detailedProjectData.teams.find((t) => t.teamId._id === selectedTeam);
      if (team) {
        const teamMemberIds = new Set(team.members.map((m) => m._id));
        if (team.leaderId) {
          teamMemberIds.add(team.leaderId._id);
        }
        initialMembers = projectMembers.filter((pm) => teamMemberIds.has(pm._id));
      }
    } else if (scope === "task" && selectedTask) {
      const task = tasks.find((t) => t._id === selectedTask);
      if (task) {
        const memberIds = new Set([task.assigneeId?._id, task.reporterId?._id].filter(Boolean));
        initialMembers = projectMembers.filter((pm) => memberIds.has(pm._id));
      }
    }
    setMembers(initialMembers);
  }, [scope, selectedTeam, selectedTask, detailedProjectData, tasks, projectMembers]);

  const addMember = (memberId) => {
    if (memberId && !members.find((m) => m._id === memberId)) {
      const memberToAdd = projectMembers.find((m) => m._id === memberId);
      if (memberToAdd) {
        setMembers([...members, memberToAdd]);
      }
    }
  };

  const removeMember = (memberId) => {
    setMembers(members.filter((m) => m._id !== memberId));
  };

  const availableMembersToAdd = useMemo(() => {
    const currentMemberIds = new Set(members.map((m) => m._id));
    return projectMembers.filter((pm) => !currentMemberIds.has(pm._id));
  }, [members, projectMembers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!title || !startTime || !endTime) {
      toast.error("Please fill in title, start time, and end time.");
      return;
    }
    if (new Date(startTime) >= new Date(endTime)) {
      toast.error("End time must be after start time.");
      return;
    }

    setIsSubmitting(true);
    try {
      const meetingData = {
        title,
        description,
        startTime,
        endTime,
        scope,
        relatedTeamId: scope === "team" ? selectedTeam : null,
        relatedTaskId: scope === "task" ? selectedTask : null,
        members: members.map((m) => m._id),
        projectId: projectData._id,
      };
      await createMeeting(meetingData);
      toast.success("Meeting created successfully!");
      onMeetingCreated(); // Callback to refresh the list
      onClose(); // Close the modal
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create meeting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <h2 className="text-2xl font-bold text-neutral-800 mb-6 flex-shrink-0">Create New Meeting</h2>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2">
          <div className="space-y-4">
            {/* Title, Description, Times */}
            <InputField label="Title" id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <InputField
              label="Description"
              id="description"
              type="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Start Time"
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
              <InputField label="End Time" id="endTime" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>

            {/* Scope and conditional fields */}
            <div>
              <label htmlFor="scope" className="block text-sm font-medium text-neutral-700">
                Scope
              </label>
              <select
                id="scope"
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value);
                  setSelectedTeam("");
                  setSelectedTask("");
                }}
                className="mt-1 block w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-neutral-50 text-neutral-900"
              >
                <option value="project">Project</option>
                <option value="team">Team</option>
                <option value="task">Task</option>
              </select>
            </div>

            {scope === "team" && (
              <div>
                <label htmlFor="team" className="block text-sm font-medium text-neutral-700">
                  Team
                </label>
                <select
                  id="team"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="mt-1 block w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-neutral-50 text-neutral-900"
                >
                  <option value="">Select a team</option>
                  {detailedProjectData?.teams?.map((team) => (
                    <option key={team.teamId._id} value={team.teamId._id}>
                      {team.teamId.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {scope === "task" && (
              <div>
                <label htmlFor="task" className="block text-sm font-medium text-neutral-700">
                  Task
                </label>
                <select
                  id="task"
                  value={selectedTask}
                  onChange={(e) => setSelectedTask(e.target.value)}
                  className="mt-1 block w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-neutral-50 text-neutral-900"
                >
                  <option value="">Select a task</option>
                  {tasks.map((task) => (
                    <option key={task._id} value={task._id}>
                      {task.key} - {task.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Member Management */}
            <div>
              <label className="block text-sm font-medium text-neutral-700">Invite Members</label>
              <div className="mt-1">
                <select
                  onChange={(e) => addMember(e.target.value)}
                  value=""
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-neutral-50 text-neutral-900"
                >
                  <option value="">Add a member...</option>
                  {availableMembersToAdd.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.fullname}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-2 p-2 border border-neutral-200 rounded-md h-40 overflow-y-auto space-y-2">
                {members.map((member) => (
                  <div key={member._id} className="flex items-center justify-between p-2 bg-neutral-50 rounded-md">
                    <div className="flex items-center gap-2">
                      <Avatar user={member} sizeClassName="w-6 h-6" textClassName="text-xs" />
                      <span className="text-sm">{member.fullname}</span>
                    </div>
                    <button type="button" onClick={() => removeMember(member._id)} className="text-neutral-500 hover:text-red-600">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}
                {members.length === 0 && <p className="text-neutral-500 text-sm p-1">No members selected. Add members from the dropdown above.</p>}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-8 pt-4 border-t border-neutral-200 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-md hover:bg-primary-600 disabled:bg-primary-300"
            >
              {isSubmitting ? "Creating..." : "Create Meeting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMeetingModal;
