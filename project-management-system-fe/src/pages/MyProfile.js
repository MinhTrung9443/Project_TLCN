import React from 'react';
import { useAuth } from '../contexts/AuthContext'; 

const MyProfilePage = () => {
    const { user } = useAuth();

    if (!user) {
        return <div>Loading user data...</div>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <h1>My Profile</h1>
            <p><strong>Full Name:</strong> {user.fullname}</p>
            <p><strong>Username:</strong> {user.username}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Phone:</strong> {user.phone || 'Not provided'}</p>
            <p><strong>Gender:</strong> {user.gender || 'Not specified'}</p>
            <p><strong>Role:</strong> {user.role}</p>
            <p><strong>Status:</strong> {user.status}</p>
        </div>
    );
};

export default MyProfilePage;