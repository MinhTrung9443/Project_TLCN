import React, { useState, useEffect, useCallback } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import userService from '../../services/userService';
import { groupService } from '../../services/groupService';
import { addMemberToProject, addMembersFromGroupToProject } from '../../services/projectService';
import '../../styles/pages/ManageProject/AddMemberModal.css'; // Cần thêm CSS cho thụt lề

const AddMemberModal = ({ isOpen, onClose, projectKey, onMemberAdded, existingMemberIds = [] }) => {
    // State để chuyển đổi giữa 2 chế độ: 'individual' hoặc 'team'
    const [addMode, setAddMode] = useState('individual');

    // State cho chế độ "Add Individual"
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedRole, setSelectedRole] = useState('MEMBER');

    // State cho chế độ "Add Team"
    const [allGroups, setAllGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [selectedLeader, setSelectedLeader] = useState(null);
    const [roleForOtherMembers, setRoleForOtherMembers] = useState('MEMBER');

    // State chung
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Hàm fetch dữ liệu ban đầu (users và groups)
    const fetchData = useCallback(async () => {
        setIsLoadingData(true);
        try {
            const [usersRes, groupsRes] = await Promise.all([
                userService.getAllUsers(),
                groupService.getGroups(),
            ]);

            // Xử lý đúng cấu trúc dữ liệu trả về
            const usersData = Array.isArray(usersRes) ? usersRes : (usersRes.data || []);
            const groupsData = Array.isArray(groupsRes.data.data) ? groupsRes.data.data : [];

            setAllUsers(usersData);
            setAllGroups(groupsData);

        } catch (error) {
            console.error("Failed to load initial data:", error);
            toast.error("Failed to load initial data.");
        } finally {
            setIsLoadingData(false);
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
        if (selectedGroup && allUsers.length > 0 && allGroups.length > 0) {
            const group = allGroups.find(g => g._id === selectedGroup.value);
            if (group && group.members) {
                const membersOfGroup = allUsers.filter(u => group.members.includes(u._id));
                setTeamMembers(membersOfGroup);
            }
            setSelectedLeader(null); // Reset leader khi đổi group
        } else {
            setTeamMembers([]);
        }
    }, [selectedGroup, allGroups, allUsers]);

    // Hàm xử lý submit
    const handleSubmit = async () => {
        setIsSaving(true);
        try {
            if (addMode === 'individual') {
                if (!selectedUser || !selectedRole) {
                    toast.warn("Please select a user and a role.");
                    setIsSaving(false);
                    return;
                }
                await addMemberToProject(projectKey, { userId: selectedUser.value, role: selectedRole });
                toast.success("Member added successfully!");

            } else if (addMode === 'team') {
                if (!selectedGroup || !selectedLeader) {
                    toast.warn("Please select a team and a leader.");
                    setIsSaving(false);
                    return;
                }
                await addMembersFromGroupToProject(projectKey, {
                    groupId: selectedGroup.value,
                    leaderId: selectedLeader.value,
                    roleForOthers: roleForOtherMembers,
                });
                toast.success("Team added successfully!");
            }
            onMemberAdded(); // Báo cho component cha để tải lại
            handleClose(); // Đóng và reset modal
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add.");
        } finally {
            setIsSaving(false);
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
        {/* Thêm class 'add-member-modal' để dễ dàng style */}
        <div className="modal-content add-member-modal">
            {/* [SỬA 1] - Sửa lại tiêu đề */}
            <h2>Add people to project</h2>
            
            {/* [SỬA 2] - Thanh chuyển đổi chế độ */}
            <div className="add-mode-toggle">
                <button 
                    className={`toggle-button ${addMode === 'individual' ? 'active' : ''}`} 
                    onClick={() => setAddMode('individual')}
                >
                    Add Individual
                </button>
                <button 
                    className={`toggle-button ${addMode === 'team' ? 'active' : ''}`} 
                    onClick={() => setAddMode('team')}
                >
                    Add Team
                </button>
            </div>

            {/* [SỬA 3] - Thêm một div bọc nội dung form để có padding */}
            <div className="form-content">
                {addMode === 'individual' && (
                    <>
                        <div className="form-group">
                            <label>Select a user</label>
                            <Select options={userOptions} value={selectedUser} onChange={setSelectedUser} isLoading={isLoadingData} />
                        </div>
                        <div className="form-group">
                            <label>Role</label>
                            <Select 
                                options={[{ value: 'MEMBER', label: 'Member' }, { value: 'LEADER', label: 'Leader' }]}
                                value={{ value: selectedRole, label: selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1).toLowerCase() }}
                                onChange={option => setSelectedRole(option.value)}
                            />
                        </div>
                    </>
                )}

                {addMode === 'team' && (
                    <>
                        <div className="form-group">
                            <label>Select a Team</label>
                            <Select options={groupOptions} value={selectedGroup} onChange={setSelectedGroup} isLoading={isLoadingData} />
                        </div>
                        {selectedGroup && (
                            <div className="form-group">
                                <label>Select a Leader for this team</label>
                                <Select options={teamMemberOptions} value={selectedLeader} onChange={setSelectedLeader} isDisabled={teamMembers.length === 0} placeholder="Select a leader from the team..." />
                            </div>
                        )}
                        <div className="form-group">
                            <label>Role for other members</label>
                            <Select 
                                options={[{ value: 'MEMBER', label: 'Member' }]}
                                value={{ value: roleForOtherMembers, label: 'Member' }}
                                onChange={option => setRoleForOtherMembers(option.value)}
                                isDisabled={true}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* [SỬA 4] - Actions nằm ở footer */}
            <div className="modal-actions">
                <button onClick={handleClose} className="btn btn-secondary" disabled={isSaving}>Cancel</button>
                <button onClick={handleSubmit} className="btn btn-primary" disabled={isSaving}>
                    {isSaving ? 'Adding...' : 'Add'}
                </button>
            </div>
        </div>
    </div>
);
}
export default AddMemberModal;