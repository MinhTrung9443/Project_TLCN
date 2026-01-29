import React, { useState, useEffect, useContext } from 'react';
import { ProjectContext } from '../../contexts/ProjectContext';
import { getMeetings } from '../../services/meetingService';
import { toast } from 'react-toastify';
import LoadingSpinner from '../ui/LoadingSpinner';
import EmptyState from '../ui/EmptyState';

// Placeholder for now
const MeetingItem = ({ meeting }) => (
    <div className="p-4 border-b">
        <p className="font-bold">{meeting.title}</p>
        <p className="text-sm">Starts: {new Date(meeting.startTime).toLocaleString()}</p>
        <p className="text-sm">Host: {meeting.createdBy?.fullname}</p>
        <button className="mt-2 px-3 py-1 text-sm bg-primary-500 text-white rounded">Join</button>
    </div>
);

const MeetingListComponent = () => {
    const { projectData, userProjectRole } = useContext(ProjectContext);
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMeetings = async () => {
            if (!projectData?._id) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                // The backend now handles role-based fetching automatically
                const res = await getMeetings(projectData._id);
                setMeetings(res.data);
            } catch (err) {
                toast.error("Failed to load meetings.");
            } finally {
                setLoading(false);
            }
        };

        fetchMeetings();
    }, [projectData, userProjectRole]);


    if (loading) return <div className="p-6"><LoadingSpinner text="Loading meetings..." /></div>;

    return (
        <div>
            {meetings.length === 0 ? (
                <EmptyState 
                    icon="event_busy"
                    title="No Meetings Scheduled"
                    description="There are no upcoming or past meetings in this project."
                />
            ) : (
                <div className="divide-y divide-neutral-200">
                    {meetings.map(meeting => (
                        <MeetingItem key={meeting._id} meeting={meeting} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MeetingListComponent;
