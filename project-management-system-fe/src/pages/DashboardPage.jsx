import React from 'react';
import { useAuth } from '../contexts/AuthContext'; 
import '../styles/pages/DashboardPage.css';

const DashboardPage = () => {
    const { user } = useAuth();

    if (!user) {
        return <div className="loading-container">Loading dashboard...</div>;
    }

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h2>Welcome back, {user.fullname}!</h2>
                <p>Here's a summary of your projects and tasks.</p>
            </header>

            <div className="dashboard-cards">
                <div className="dashboard-card">
                    <div className="card-stat">5</div>
                    <h3>Active Projects</h3>
                    <p>Projects you are currently working on.</p>
                </div>

                <div className="dashboard-card">
                    <div className="card-stat">3</div>
                    <h3>Tasks Due Today</h3>
                    <p>Items that require your immediate attention.</p>
                </div>

                <div className="dashboard-card">
                    <div className="card-stat">12</div>
                    <h3>Overdue Tasks</h3>
                    <p>Tasks that have passed their due date.</p>
                </div>
                
                <div className="dashboard-card">
                    <h3>Team Activity</h3>
                    <p>View the latest updates from your team members.</p>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;