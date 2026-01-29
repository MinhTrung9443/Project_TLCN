import React, { useState, useEffect, useContext, useMemo } from "react";
import { ProjectContext } from "../../contexts/ProjectContext";
import { getMeetings, rsvpToMeeting } from "../../services/meetingService";
import { toast } from "react-toastify";
import LoadingSpinner from "../ui/LoadingSpinner";
import EmptyState from "../ui/EmptyState";
import DeclineReasonModal from "../modals/DeclineReasonModal";
import Avatar from "../common/Avatar";

const statusStyles = {
  accepted: "bg-success-100 text-success-700 border-success-200",
  pending: "bg-warning-100 text-warning-700 border-warning-200",
  declined: "bg-accent-100 text-accent-700 border-accent-200",
};

const InvitationItem = ({ invitation, onRsvp, isSelected, onSelect }) => {
  const { title, startTime, endTime, createdBy } = invitation;

  return (
    <button
      type="button"
      onClick={() => onSelect(invitation)}
      className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-sm ${
        isSelected ? "border-primary-400 bg-primary-50" : "border-neutral-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-neutral-900 line-clamp-1">{title}</p>
          <p className="text-sm text-neutral-600 mt-1">
            {new Date(startTime).toLocaleString()} • {new Date(endTime).toLocaleString()}
          </p>
          <p className="text-xs text-neutral-500 mt-1">Host: {createdBy?.fullname || "Unknown User"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {invitation.relatedTeamId?.name ? (
              <span className="px-2 py-0.5 text-xs rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                Team: {invitation.relatedTeamId.name}
              </span>
            ) : null}
            {invitation.relatedTaskId?.key ? (
              <span className="px-2 py-0.5 text-xs rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                Task: {invitation.relatedTaskId.key}
              </span>
            ) : null}
          </div>
        </div>
        <span className="px-2.5 py-1 text-xs rounded-full border border-neutral-200 text-neutral-600">pending</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRsvp(invitation._id, "accepted");
          }}
          className="px-3 py-1.5 text-xs font-medium text-white bg-success-600 rounded-md hover:bg-success-700 transition-colors"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRsvp(invitation._id, "declined");
          }}
          className="px-3 py-1.5 text-xs font-medium text-white bg-accent-600 rounded-md hover:bg-accent-700 transition-colors"
        >
          Decline
        </button>
      </div>
    </button>
  );
};

const InvitationListComponent = () => {
  const { projectData } = useContext(ProjectContext);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalState, setModalState] = useState({ isOpen: false, meetingId: null });
  const [selectedInvitation, setSelectedInvitation] = useState(null);

  const participantCount = useMemo(() => selectedInvitation?.participants?.length || 0, [selectedInvitation]);

  const fetchInvitations = async () => {
    if (!projectData?._id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await getMeetings(projectData._id, "pending");
      setInvitations(res.data || []);
      setSelectedInvitation((prev) => prev || res.data?.[0] || null);
    } catch (err) {
      setError("Failed to load invitations.");
      toast.error("Failed to load invitations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [projectData]);

  const handleRsvp = async (meetingId, status, reason = "") => {
    if (status === "declined" && !modalState.isOpen) {
      setModalState({ isOpen: true, meetingId: meetingId });
      return;
    }

    try {
      await rsvpToMeeting(meetingId, status, reason);
      toast.success(`You have ${status} the invitation.`);
      fetchInvitations();
      if (modalState.isOpen) {
        setModalState({ isOpen: false, meetingId: null });
      }
    } catch (err) {
      toast.error("Failed to respond to invitation.");
    }
  };

  const handleModalSubmit = (reason) => {
    if (modalState.meetingId) {
      handleRsvp(modalState.meetingId, "declined", reason);
    }
  };

  if (loading)
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading invitations..." />
      </div>
    );
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-3">
        {invitations.length === 0 ? (
          <EmptyState
            icon="mark_email_read"
            title="No Pending Invitations"
            description="You're all caught up with your meeting invitations in this project."
          />
        ) : (
          invitations.map((invitation) => (
            <InvitationItem
              key={invitation._id}
              invitation={invitation}
              onRsvp={handleRsvp}
              isSelected={selectedInvitation?._id === invitation._id}
              onSelect={setSelectedInvitation}
            />
          ))
        )}
      </div>

      <div className="lg:col-span-2">
        {!selectedInvitation ? (
          <div className="bg-white border border-neutral-200 rounded-xl p-6 text-center text-neutral-500">Select an invitation to view details</div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-neutral-900">{selectedInvitation.title}</h3>
                <p className="text-sm text-neutral-600 mt-1">
                  {new Date(selectedInvitation.startTime).toLocaleString()} • {new Date(selectedInvitation.endTime).toLocaleString()}
                </p>
                <p className="text-sm text-neutral-500 mt-1">Host: {selectedInvitation.createdBy?.fullname || "Unknown User"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedInvitation.relatedTeamId?.name ? (
                    <span className="px-2.5 py-1 text-xs rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                      Team: {selectedInvitation.relatedTeamId.name}
                    </span>
                  ) : null}
                  {selectedInvitation.relatedTaskId?.key ? (
                    <span className="px-2.5 py-1 text-xs rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                      Task: {selectedInvitation.relatedTaskId.key} • {selectedInvitation.relatedTaskId.name}
                    </span>
                  ) : null}
                </div>
              </div>
              <span className="px-3 py-1 text-xs rounded-full border border-neutral-200 text-neutral-600">pending</span>
            </div>

            {selectedInvitation.description && (
              <div>
                <h4 className="text-sm font-semibold text-neutral-800 mb-1">Description</h4>
                <p className="text-sm text-neutral-700 whitespace-pre-line">{selectedInvitation.description}</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-neutral-800">Participants</h4>
                <span className="text-xs text-neutral-500">{participantCount} members</span>
              </div>
              <div className="space-y-2">
                {selectedInvitation.participants?.map((p) => (
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
                {!selectedInvitation.participants?.length && <p className="text-sm text-neutral-500">No participants yet.</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      <DeclineReasonModal isOpen={modalState.isOpen} onClose={() => setModalState({ isOpen: false, meetingId: null })} onSubmit={handleModalSubmit} />
    </div>
  );
};

export default InvitationListComponent;
