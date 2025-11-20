// src/components/project/AddMemberModal.jsx
// [PHIÊN BẢN MỚI] - Hỗ trợ thêm cá nhân và thêm cả team

import React, { useState, useEffect, useCallback } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import userService from '../../services/userService';
import { groupService } from '../../services/groupService';
import { addMemberToProject, addMembersFromGroupToProject } from '../../services/projectService'; // Giả sử bạn có hàm này

const AddMemberModal = ({ isOpen, onClose, projectKey, onMemberAdded, existingMemberIds = []}) => {
    // State để chuyển đổi giữa 2 chế độ: 'individual' hoặc 'team'
    const [addMode, setAddMode] = useState('individual'); 

    // === State cho chế độ "Add Individual" ===
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null); // Chỉ chọn 1 user
    const [selectedRole, setSelectedRole] = useState('MEMBER');

    // === State cho chế độ "Add Team" ===
    const [allGroups, setAllGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null); // Chỉ chọn 1 group
    const [teamMembers, setTeamMembers] = useState([]); // Thành viên của group được chọn
    const [selectedLeader, setSelectedLeader] = useState(null); // Leader cho team này
    const [roleForOtherMembers, setRoleForOtherMembers] = useState('MEMBER');

    // === State chung ===
    const [isLoading, setIsLoading] = useState(false);

    // Hàm fetch dữ liệu ban đầu (users và groups)
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [usersRes, groupsRes] = await Promise.all([
                userService.getAllUsers(), // Hàm này trả về mảng user
                groupService.getGroups(),   // Hàm này trả về { data: [...] }
            ]);

            const usersData = Array.isArray(usersRes) ? usersRes : (usersRes.data || []);
            const groupsData = Array.isArray(groupsRes.data.data) ? groupsRes.data.data : [];

            setAllUsers(usersData);
            setAllGroups(groupsData);

        } catch (error) {
            toast.error("Failed to load initial data.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch dữ liệu khi modal được mở
    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, fetchData]);

    // Khi chọn một group, cập nhật danh sách thành viên của group đó
    useEffect(() => {
        if (selectedGroup) {
            const group = allGroups.find(g => g._id === selectedGroup.value);
            // Lấy thông tin chi tiết các thành viên của team
            const membersOfGroup = allUsers.filter(u => group?.members.includes(u._id));
            setTeamMembers(membersOfGroup);
            setSelectedLeader(null); // Reset leader khi đổi group
        } else {
            setTeamMembers([]);
        }
    }, [selectedGroup, allGroups, allUsers]);

    // Hàm xử lý submit
    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            if (addMode === 'individual') {
                if (!selectedUser || !selectedRole) {
                    toast.warn("Please select a user and a role.");
                    return;
                }
                await addMemberToProject(projectKey, { userId: selectedUser.value, role: selectedRole });
            } 
            else if (addMode === 'team') {
                if (!selectedGroup || !selectedLeader) {
                    toast.warn("Please select a team and a leader for the team.");
                    return;
                }
                // Gọi API mới để thêm cả team (bạn cần tạo API này ở backend)
                // API này sẽ nhận groupId, leaderId, và role cho các member còn lại
                await addMembersFromGroupToProject(projectKey, { 
                    groupId: selectedGroup.value, 
                    leaderId: selectedLeader.value,
                    roleForOthers: roleForOtherMembers,
                });
            }
            toast.success("Successfully added!");
            onMemberAdded(); // Báo cho component cha để tải lại
            handleClose();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add.");
        } finally {
            setIsLoading(false);
        }
    };

    // Hàm reset state khi đóng modal
    const handleClose = () => {
        setAddMode('individual');
        setSelectedUser(null);
        setSelectedRole('MEMBER');
        setSelectedGroup(null);
        setSelectedLeader(null);
        setRoleForOtherMembers('MEMBER');
        onClose();
    };

    if (!isOpen) return null;

    // --- Định dạng options cho các dropdown của react-select ---
    const userOptions = allUsers
        .filter(u => !existingMemberIds.includes(u._id))
        .map(u => ({ value: u._id, label: u.fullname || u.username }));
        
    const groupOptions = allGroups.map(g => ({ value: g._id, label: g.name }));
    
    const teamMemberOptions = teamMembers.map(u => ({ value: u._id, label: u.fullname || u.username }));

    return (
        <div className="modal-overlay">
            <div className="modal-content add-member-modal">
                <h2>Add people to project</h2>
                
                {/* --- Thanh chuyển đổi chế độ --- */}
                <div className="add-mode-toggle">
                    <button className={addMode === 'individual' ? 'active' : ''} onClick={() => setAddMode('individual')}>Add Individual</button>
                    <button className={addMode === 'team' ? 'active' : ''} onClick={() => setAddMode('team')}>Add Team</button>
                </div>

                {/* --- Form cho chế độ "Add Individual" --- */}
                {addMode === 'individual' && (
                    <>
                        <div className="form-group">
                            <label>Select a user</label>
                            <Select options={userOptions} value={selectedUser} onChange={setSelectedUser} isLoading={isLoading} />
                        </div>
                        <div className="form-group">
                            <label>Role</label>
                            <Select 
                                options={[{value: 'MEMBER', label: 'Member'}, {value: 'LEADER', label: 'Leader'}]} 
                                value={{value: selectedRole, label: selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1).toLowerCase()}}
                                onChange={option => setSelectedRole(option.value)}
                            />
                        </div>
                    </>
                )}

                {/* --- Form cho chế độ "Add Team" --- */}
                {addMode === 'team' && (
                    <>
                        <div className="form-group">
                            <label>Select a Team</label>
                            <Select options={groupOptions} value={selectedGroup} onChange={setSelectedGroup} isLoading={isLoading} />
                        </div>
                        {selectedGroup && (
                            <div className="form-group">
                                <label>Select a Leader for this team</label>
                                <Select options={teamMemberOptions} value={selectedLeader} onChange={setSelectedLeader} isDisabled={teamMembers.length === 0} />
                            </div>
                        )}
                        <div className="form-group">
                            <label>Role for other members</label>
                            <Select 
                                options={[{value: 'MEMBER', label: 'Member'}]} 
                                value={{value: roleForOtherMembers, label: 'Member'}}
                                onChange={option => setRoleForOtherMembers(option.value)}
                            />
                        </div>
                    </>
                )}

                <div className="modal-actions">
                    <button onClick={handleClose} className="btn btn-secondary" disabled={isLoading}>Cancel</button>
                    <button onClick={handleSubmit} className="btn btn-primary" disabled={isLoading}>
                        {isLoading ? 'Adding...' : 'Add'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddMemberModal;