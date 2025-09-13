import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import '../styles/pages/MyProfilePage.css';
import userService from '../services/userService'; 

const MyProfilePage = () => {
    const { user, login } = useAuth();
    const [formData, setFormData] = useState({
        fullname: '',
        username: '',
        email: '',
        phone: '',
        gender: '',
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setFormData({
                fullname: user.fullname || '',
                username: user.username || '',
                email: user.email || '',
                phone: user.phone || '',
                gender: user.gender || '',
            });
            setLoading(false);
        }
    }, [user]); 

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value,
        }));
    };

     const handleSubmit = async (e) => {
        e.preventDefault();
        toast.info("Updating profile...");

        try {
            // ----- GỌI API THẬT -----
            const response = await userService.updateProfile(formData);
            
            // Lấy user đã được cập nhật từ response của API
            const updatedUser = response.data.user; 
            
            const token = localStorage.getItem('token');
            login(updatedUser, token); // Cập nhật lại Context

            toast.success("Profile updated successfully!");

        } catch (error) {
            console.error("Failed to update profile:", error);
            toast.error(error.response?.data?.message || "Failed to update profile.");
        }
    };

    if (loading) {
        return <div className="loading-container">Loading profile...</div>;
    }

    return (
        <div className="profile-page-container">
            <form onSubmit={handleSubmit} className="profile-form">
                <div className="profile-main-content">
                    <div className="profile-tabs">
                        <span className="tab-item active">Personal</span>
                    </div>

                    <div className="form-section">
                        <h3 className="section-title">Basic Info</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="fullname">Full Name *</label>
                                <input
                                    type="text"
                                    id="fullname"
                                    name="fullname"
                                    value={formData.fullname}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="username">Username *</label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                    disabled
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email *</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    disabled 
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone">Phone</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="gender">Gender</label>
                                <select id="gender" name="gender" value={formData.gender} onChange={handleChange}>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn-save">Save</button>
                    </div>
                </div>

                <div className="profile-sidebar">
                    <div className="avatar-section">
                        <div className="avatar-display">
                           {user.fullname ? user.fullname.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <button type="button" className="btn-upload-avatar">
                            Upload Avatar
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default MyProfilePage;