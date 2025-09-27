import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

import userService from '../../services/userService'; 
import { groupService } from '../../services/groupService'; 
import { addMemberToProject, addGroupToProject } from '../../services/projectService';
import '../../styles/pages/ManageProject/AddMemberModal.css';

const AddMemberModal = ({ isOpen, onClose, projectKey, onMemberAdded }) => {
    const [allUsers, setAllUsers] = useState([]);
    const [allGroups, setAllGroups] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [selectedRole, setSelectedRole] = useState('Customer');
    const [isSaving, setIsSaving] = useState(false);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLoadingData(true);
            const fetchData = async () => {
                try {
                    const [userResponse, groupResponse] = await Promise.all([
                        userService.getAllUsers(1, 1000), 
                        groupService.getGroups()
                    ]);
                    
                    // ===> SỬA LẠI 2 DÒNG DƯỚI ĐÂY <===

                    // 1. API user trả về thẳng một mảng, nên ta gán trực tiếp userResponse.data
                    setAllUsers(userResponse || []); 

                    // 2. Tương tự, giả sử API group cũng trả về thẳng một mảng
                    setAllGroups(groupResponse.data.data || []); 
                    
                } catch (error) {
                    console.error("Fetch Data Error:", error);
                    // Kiểm tra xem có phải lỗi 401 không
                    if (error.response && error.response.status === 401) {
                         toast.error("Authentication error. Please log in again.");
                    } else {
                         toast.error("Could not fetch data for modal.");
                    }
                } finally {
                    setLoadingData(false);
                }
            };
            fetchData();
        }
    }, [isOpen]);


    const handleSubmit = async () => {
        if (!selectedUserId && !selectedGroupId) {
            toast.warn("Please select a member or a group to add.");
            return;
        }
        setIsSaving(true);
        try {
            const promises = [];
            if (selectedUserId) {
                promises.push(addMemberToProject(projectKey, { userId: selectedUserId, role: selectedRole }));
            }
            if (selectedGroupId) {
                promises.push(addGroupToProject(projectKey, { groupId: selectedGroupId }));
            }
            await Promise.all(promises);
            toast.success("Items added successfully!");
            onMemberAdded();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add items.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Add Member</h2>
                {loadingData ? (
                    <div>Loading data...</div>
                ) : (
                    <div className="modal-form">
                        <div className="form-group">
                            <label>Add Members to Project</label>
                            <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                                <option value="">-- Select a user --</option>
                                {allUsers.map(user => (
                                    <option key={user._id} value={user._id}>{user.fullname}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Add Groups to Project</label>
                            <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
                                <option value="">-- Select a group --</option>
                                {allGroups.map(group => (
                                    <option key={group._id} value={group._id}>{group.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <label>Role</label>
                            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                                <option value="Customer">Customer</option>
                                <option value="Developer">Developer</option>
                                <option value="QA">QA</option>
                                <option value="Leader">Leader</option>
                            </select>
                        </div>
                    </div>
                )}
                <div className="modal-actions">
                    <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                    <button onClick={handleSubmit} className="btn btn-primary" disabled={isSaving || loadingData}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddMemberModal;