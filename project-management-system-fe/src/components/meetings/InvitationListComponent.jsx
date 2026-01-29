import React, { useState, useEffect, useContext } from 'react';
import { ProjectContext } from '../../contexts/ProjectContext';
import { getMeetings, rsvpToMeeting } from '../../services/meetingService';
import { toast } from 'react-toastify';
import LoadingSpinner from '../ui/LoadingSpinner';
import EmptyState from '../ui/EmptyState';
import DeclineReasonModal from '../modals/DeclineReasonModal';

const InvitationItem = ({ invitation, onRsvp }) => {
  const { title, startTime, endTime, createdBy } = invitation;

  return (
    <div className="p-4 border-b border-neutral-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex-1">
        <p className="font-bold text-neutral-800">{title}</p>
        <div className="text-sm text-neutral-600 mt-1 flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">event</span>
            {new Date(startTime).toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">person</span>
            {createdBy?.fullname || 'Unknown User'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button 
            onClick={() => onRsvp(invitation._id, 'accepted')}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
        >
            Accept
        </button>
        <button 
            onClick={() => onRsvp(invitation._id, 'declined')}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
        >
            Decline
        </button>
      </div>
    </div>
  );
};


const InvitationListComponent = () => {
  const { projectData } = useContext(ProjectContext);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalState, setModalState] = useState({ isOpen: false, meetingId: null });

  const fetchInvitations = async () => {
    if (!projectData?._id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await getMeetings(projectData._id, 'pending');
      setInvitations(res.data);
    } catch (err) {
      setError('Failed to load invitations.');
      toast.error('Failed to load invitations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [projectData]);

  const handleRsvp = async (meetingId, status, reason = '') => {
    if (status === 'declined' && !modalState.isOpen) {
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
        toast.error('Failed to respond to invitation.');
    }
  };
  
  const handleModalSubmit = (reason) => {
    if (modalState.meetingId) {
        handleRsvp(modalState.meetingId, 'declined', reason);
    }
  };

  if (loading) return <div className="p-6"><LoadingSpinner text="Loading invitations..." /></div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div>
      {invitations.length === 0 ? (
        <EmptyState 
            icon="mark_email_read"
            title="No Pending Invitations"
            description="You're all caught up with your meeting invitations in this project."
        />
      ) : (
        <div className="divide-y divide-neutral-200">
          {invitations.map(invitation => (
            <InvitationItem key={invitation._id} invitation={invitation} onRsvp={handleRsvp} />
          ))}
        </div>
      )}
      <DeclineReasonModal 
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, meetingId: null })}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

export default InvitationListComponent;
