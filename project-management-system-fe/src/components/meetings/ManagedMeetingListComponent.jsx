import React, { useState, useEffect, useContext, useMemo } from "react";
import { ProjectContext } from "../../contexts/ProjectContext";
import { useAuth } from "../../contexts/AuthContext";
import { getManagedMeetings } from "../../services/meetingService";
import { toast } from "react-toastify";
import LoadingSpinner from "../ui/LoadingSpinner";
import EmptyState from "../ui/EmptyState";
import Avatar from "../common/Avatar";

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
          {meeting.relatedTeamId?.name && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-primary-50 text-primary-700 border border-primary-200">
              Team: {meeting.relatedTeamId.name}
            </span>
          )}
          {meeting.relatedTaskId?.key && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
              Task: {meeting.relatedTaskId.key}
            </span>
          )}
        </div>
      </div>
      <span className="px-2.5 py-1 text-xs rounded-full border border-neutral-200 text-neutral-600">{meeting.status || "scheduled"}</span>
    </div>
  </button>
);

const ManagedMeetingListComponent = () => {
  const { projectData } = useContext(ProjectContext);
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  const participantCount = useMemo(() => selectedMeeting?.participants?.length || 0, [selectedMeeting]);

  const fetchMeetings = async () => {
    if (!projectData?._id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await getManagedMeetings(projectData._id);
      const data = res.data || [];
      setMeetings(data);
      setSelectedMeeting((prev) => {
        if (!data.length) return null;
        if (!prev) return data[0];
        return data.find((m) => m._id === prev._id) || data[0];
      });
    } catch {
      toast.error("Failed to load managed meetings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [projectData]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading meetings..." />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
      <div className="lg:col-span-1 overflow-y-auto space-y-3 pr-1">
        {meetings.length === 0 ? (
          <EmptyState icon="event_busy" title="No Managed Meetings" description="There are no meetings to manage in this project." />
        ) : (
          meetings.map((meeting) => (
            <MeetingItem key={meeting._id} meeting={meeting} isSelected={selectedMeeting?._id === meeting._id} onSelect={setSelectedMeeting} />
          ))
        )}
      </div>

      <div className="lg:col-span-2 overflow-y-auto pr-1">
        {!selectedMeeting ? (
          <div className="bg-white border border-neutral-200 rounded-xl p-6 text-center text-neutral-500">Select a meeting to view details</div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-neutral-900">{selectedMeeting.title}</h3>
              <p className="text-sm text-neutral-600 mt-1">
                {new Date(selectedMeeting.startTime).toLocaleString()} • {new Date(selectedMeeting.endTime).toLocaleString()}
              </p>
              <p className="text-sm text-neutral-500 mt-1">Host: {selectedMeeting.createdBy?.fullname || "Unknown"}</p>
            </div>

            {selectedMeeting.description && <p className="text-sm text-neutral-700 whitespace-pre-line">{selectedMeeting.description}</p>}

            {/* Attachments */}
            {selectedMeeting.attachments && selectedMeeting.attachments.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-neutral-800 mb-2">Attachments</h4>
                <div className="space-y-1 p-2 bg-neutral-50 rounded-lg border border-neutral-200">
                  {selectedMeeting.attachments.map((attachment) => (
                    <a
                      key={attachment._id}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 text-primary-600 hover:text-primary-700 hover:bg-neutral-100 rounded transition-colors group"
                    >
                      <span className="material-symbols-outlined text-base">attach_file</span>
                      <span className="text-sm truncate flex-1">{attachment.filename}</span>
                      <span className="material-symbols-outlined text-base opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Chat History */}
            {selectedMeeting.chatHistoryLink && (
              <div>
                <h4 className="text-sm font-semibold text-neutral-800 mb-2">Chat History</h4>
                <a
                  href={selectedMeeting.chatHistoryLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-blue-50 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors group border border-blue-200"
                >
                  <span className="material-symbols-outlined text-base">message</span>
                  <span className="text-sm truncate flex-1">Download Chat History</span>
                  <span className="material-symbols-outlined text-base opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span>
                </a>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-neutral-800">Participants</h4>
                <span className="text-xs text-neutral-500">{participantCount} members</span>
              </div>
              <div className="space-y-2">
                {selectedMeeting.participants?.map((p) => (
                  <div key={p.userId?._id || p._id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar user={p.userId} sizeClassName="w-8 h-8" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.userId?.fullname || "Unknown"}</p>
                        {p.status === "declined" && p.reason && <p className="text-xs text-neutral-500 truncate">Reason: {p.reason}</p>}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 text-xs rounded-full border ${
                        statusStyles[p.status] || "border-neutral-200 text-neutral-600 bg-neutral-50"
                      }`}
                    >
                      {p.status || "pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagedMeetingListComponent;
