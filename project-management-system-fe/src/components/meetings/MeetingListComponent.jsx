import React, { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectContext } from "../../contexts/ProjectContext";
import { useAuth } from "../../contexts/AuthContext";
import { getMeetings, updateMeeting, deleteMeeting, joinMeeting } from "../../services/meetingService";
import { toast } from "react-toastify";
import LoadingSpinner from "../ui/LoadingSpinner";
import EmptyState from "../ui/EmptyState";
import Avatar from "../common/Avatar";
import InputField from "../common/InputField";
import ConfirmationModal from "../common/ConfirmationModal";

const statusStyles = {
  accepted: "bg-success-100 text-success-700 border-success-200",
  pending: "bg-warning-100 text-warning-700 border-warning-200",
  declined: "bg-accent-100 text-accent-700 border-accent-200",
};

const MeetingItem = ({ meeting, isSelected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(meeting)}
    className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-sm ${
      isSelected ? "border-primary-400 bg-primary-50" : "border-neutral-200 bg-white"
    }`}
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-semibold text-neutral-900 line-clamp-1">{meeting.title}</p>
        <p className="text-sm text-neutral-600 mt-1">
          {new Date(meeting.startTime).toLocaleString()} • {new Date(meeting.endTime).toLocaleString()}
        </p>
        <p className="text-xs text-neutral-500 mt-1">Host: {meeting.createdBy?.fullname || "Unknown"}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {meeting.relatedTeamId?.name ? (
            <span className="px-2 py-0.5 text-xs rounded-full bg-primary-50 text-primary-700 border border-primary-200">
              Team: {meeting.relatedTeamId.name}
            </span>
          ) : null}
          {meeting.relatedTaskId?.key ? (
            <span className="px-2 py-0.5 text-xs rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
              Task: {meeting.relatedTaskId.key}
            </span>
          ) : null}
        </div>
      </div>
      <span className="px-2.5 py-1 text-xs rounded-full border border-neutral-200 text-neutral-600">{meeting.status || "scheduled"}</span>
    </div>
  </button>
);

const MeetingListComponent = () => {
  const { projectData, userProjectRole } = useContext(ProjectContext);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", startTime: "", endTime: "" });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const participantCount = useMemo(() => selectedMeeting?.participants?.length || 0, [selectedMeeting]);

  const toLocalInput = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const fetchMeetings = async () => {
    if (!projectData?._id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await getMeetings(projectData._id);
      const data = res.data || [];
      setMeetings(data);
      setSelectedMeeting((prev) => {
        if (!data.length) return null;
        if (!prev) return data[0];
        return data.find((m) => m._id === prev._id) || data[0];
      });
    } catch (err) {
      toast.error("Failed to load meetings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [projectData, userProjectRole]);

  useEffect(() => {
    if (!selectedMeeting) return;
    setEditForm({
      title: selectedMeeting.title || "",
      description: selectedMeeting.description || "",
      startTime: toLocalInput(selectedMeeting.startTime),
      endTime: toLocalInput(selectedMeeting.endTime),
    });
  }, [selectedMeeting]);

  const handleSaveEdit = async () => {
    if (!selectedMeeting?._id) return;
    if (!editForm.title || !editForm.startTime || !editForm.endTime) {
      toast.error("Please fill in title, start time, and end time.");
      return;
    }
    if (new Date(editForm.startTime) >= new Date(editForm.endTime)) {
      toast.error("End time must be after start time.");
      return;
    }
    try {
      await updateMeeting(selectedMeeting._id, {
        title: editForm.title,
        description: editForm.description,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
      });
      toast.success("Meeting updated.");
      setIsEditing(false);
      await fetchMeetings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update meeting.");
    }
  };

  const handleDelete = async () => {
    if (!selectedMeeting?._id) return;
    try {
      await deleteMeeting(selectedMeeting._id);
      toast.success("Meeting deleted.");
      setIsDeleteModalOpen(false);
      setSelectedMeeting(null);
      await fetchMeetings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete meeting.");
    }
  };

  const handleJoinMeeting = () => {
    if (!selectedMeeting?._id) return;
    navigate(`/meeting-room/${selectedMeeting._id}`);
  };

  if (loading)
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading meetings..." />
      </div>
    );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          {meetings.length === 0 ? (
            <EmptyState icon="event_busy" title="No Meetings Scheduled" description="There are no upcoming or past meetings in this project." />
          ) : (
            meetings.map((meeting) => (
              <MeetingItem key={meeting._id} meeting={meeting} isSelected={selectedMeeting?._id === meeting._id} onSelect={setSelectedMeeting} />
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {!selectedMeeting ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-6 text-center text-neutral-500">Select a meeting to view details</div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-neutral-900">{selectedMeeting.title}</h3>
                  <p className="text-sm text-neutral-600 mt-1">
                    {new Date(selectedMeeting.startTime).toLocaleString()} • {new Date(selectedMeeting.endTime).toLocaleString()}
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">Host: {selectedMeeting.createdBy?.fullname || "Unknown"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedMeeting.relatedTeamId?.name ? (
                      <span className="px-2.5 py-1 text-xs rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                        Team: {selectedMeeting.relatedTeamId.name}
                      </span>
                    ) : null}
                    {selectedMeeting.relatedTaskId?.key ? (
                      <span className="px-2.5 py-1 text-xs rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                        Task: {selectedMeeting.relatedTaskId.key} • {selectedMeeting.relatedTaskId.name}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 text-xs rounded-full border border-neutral-200 text-neutral-600">
                    {selectedMeeting.status || "scheduled"}
                  </span>
                  <button
                    className="px-3 py-1.5 text-xs font-medium text-white bg-primary-500 rounded-md hover:bg-primary-600"
                    onClick={handleJoinMeeting}
                  >
                    Join
                  </button>
                  {user?._id && selectedMeeting.createdBy?._id?.toString() === user._id.toString() ? (
                    <>
                      <button
                        className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200"
                        onClick={() => setIsEditing((prev) => !prev)}
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </button>
                      <button
                        className="px-3 py-1.5 text-xs font-medium text-white bg-accent-600 rounded-md hover:bg-accent-700"
                        onClick={() => setIsDeleteModalOpen(true)}
                      >
                        Delete
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <InputField
                    label="Title"
                    id="editTitle"
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                  <InputField
                    label="Description"
                    id="editDescription"
                    type="textarea"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows="3"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                      label="Start Time"
                      id="editStartTime"
                      type="datetime-local"
                      value={editForm.startTime}
                      onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                    />
                    <InputField
                      label="End Time"
                      id="editEndTime"
                      type="datetime-local"
                      value={editForm.endTime}
                      onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-md hover:bg-primary-600"
                      onClick={handleSaveEdit}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : selectedMeeting.description ? (
                <div>
                  <h4 className="text-sm font-semibold text-neutral-800 mb-1">Description</h4>
                  <p className="text-sm text-neutral-700 whitespace-pre-line">{selectedMeeting.description}</p>
                </div>
              ) : null}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-neutral-800">Participants</h4>
                  <span className="text-xs text-neutral-500">{participantCount} members</span>
                </div>
                <div className="space-y-2">
                  {selectedMeeting.participants?.map((p) => (
                    <div key={p.userId?._id || p._id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-200">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar user={p.userId} sizeClassName="w-8 h-8" textClassName="text-xs" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">{p.userId?.fullname || "Unknown"}</p>
                          {p.status === "declined" && p.reason ? <p className="text-xs text-neutral-500 truncate">Reason: {p.reason}</p> : null}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 text-xs rounded-full border ${statusStyles[p.status] || "border-neutral-200 text-neutral-600 bg-neutral-50"}`}
                      >
                        {p.status || "pending"}
                      </span>
                    </div>
                  ))}
                  {!selectedMeeting.participants?.length && <p className="text-sm text-neutral-500">No participants yet.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Meeting"
        message={`Are you sure you want to delete "${selectedMeeting?.title || "this meeting"}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
};

export default MeetingListComponent;
