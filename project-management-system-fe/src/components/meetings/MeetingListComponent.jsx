import React, { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectContext } from "../../contexts/ProjectContext";
import { useAuth } from "../../contexts/AuthContext";
import { getMeetings, deleteMeeting } from "../../services/meetingService";
import { toast } from "react-toastify";
import LoadingSpinner from "../ui/LoadingSpinner";
import EmptyState from "../ui/EmptyState";
import Avatar from "../common/Avatar";
import ConfirmationModal from "../common/ConfirmationModal";
import EditMeetingModal from "../modals/EditMeetingModal";
import MeetingSummaryPanel from "./MeetingSummaryPanel";

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

const MeetingListComponent = () => {
  const { projectData, userProjectRole } = useContext(ProjectContext);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState("details");

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const participantCount = useMemo(() => selectedMeeting?.participants?.length || 0, [selectedMeeting]);

  // Filter meetings based on status and search
  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting) => {
      const matchesStatus = statusFilter === "all" || meeting.status === statusFilter;
      const matchesSearch =
        searchQuery === "" ||
        meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.createdBy?.fullname?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [meetings, statusFilter, searchQuery]);

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
    } catch {
      toast.error("Failed to load meetings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [projectData, userProjectRole]);

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

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading meetings..." />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
        <div className="lg:col-span-1 overflow-y-auto space-y-3 pr-1">
          {/* Filter Bar */}
          <div className="sticky top-0 bg-white z-10 pb-3 space-y-2">
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">search</span>
              <input
                type="text"
                placeholder="Search meetings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {["all", "scheduled", "ongoing", "completed"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                    statusFilter === status ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filteredMeetings.length === 0 ? (
            <EmptyState
              icon="event_busy"
              title={searchQuery || statusFilter !== "all" ? "No Meetings Found" : "No Meetings Scheduled"}
              description={
                searchQuery || statusFilter !== "all" ? "Try adjusting your filters" : "There are no upcoming or past meetings in this project."
              }
            />
          ) : (
            filteredMeetings.map((meeting) => (
              <MeetingItem key={meeting._id} meeting={meeting} isSelected={selectedMeeting?._id === meeting._id} onSelect={setSelectedMeeting} />
            ))
          )}
        </div>

        <div className="lg:col-span-2 overflow-y-auto pr-1">
          {!selectedMeeting ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-6 text-center text-neutral-500">Select a meeting to view details</div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-xl">
              {/* Meeting Header */}
              <div className="p-6 border-b border-neutral-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-neutral-900">{selectedMeeting.title}</h3>
                    <p className="text-sm text-neutral-600 mt-1">
                      {new Date(selectedMeeting.startTime).toLocaleString()} • {new Date(selectedMeeting.endTime).toLocaleString()}
                    </p>
                    <p className="text-sm text-neutral-500 mt-1">Host: {selectedMeeting.createdBy?.fullname || "Unknown"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedMeeting.status == "scheduled" && (
                      <>
                        <button
                          className="px-3 py-1.5 text-xs font-medium text-white bg-primary-500 rounded-md hover:bg-primary-600"
                          onClick={handleJoinMeeting}
                        >
                          Join
                        </button>
                        {user?._id === selectedMeeting.createdBy?._id && (
                          <>
                            <button
                              className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 rounded-md"
                              onClick={() => setIsEditModalOpen(true)}
                            >
                              Edit
                            </button>
                            <button
                              className="px-3 py-1.5 text-xs font-medium text-white bg-accent-600 rounded-md"
                              onClick={() => setIsDeleteModalOpen(true)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="border-b border-neutral-200">
                <div className="flex items-center gap-1 px-6">
                  <button
                    onClick={() => setActiveDetailTab("details")}
                    className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                      activeDetailTab === "details"
                        ? "border-primary-500 text-primary-600"
                        : "border-transparent text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setActiveDetailTab("summary")}
                    className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                      activeDetailTab === "summary"
                        ? "border-primary-500 text-primary-600"
                        : "border-transparent text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    Summary
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeDetailTab === "details" ? (
                  <div className="space-y-6">
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
                              <span className="material-symbols-outlined text-base opacity-0 group-hover:opacity-100 transition-opacity">
                                open_in_new
                              </span>
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
                          <span className="material-symbols-outlined text-base opacity-0 group-hover:opacity-100 transition-opacity">
                            open_in_new
                          </span>
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
                            <div className="flex items-center gap-3">
                              <Avatar user={p.userId} sizeClassName="w-8 h-8" />
                              <p className="text-sm font-medium">{p.userId?.fullname || "Unknown"}</p>
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
                ) : (
                  <MeetingSummaryPanel meetingId={selectedMeeting._id} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <EditMeetingModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        meeting={selectedMeeting}
        onMeetingUpdated={() => {
          fetchMeetings();
          setSelectedMeeting(null);
        }}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Meeting"
        message={`Are you sure you want to delete "${selectedMeeting?.title || "this meeting"}"?`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
};

export default MeetingListComponent;
