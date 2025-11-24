import React, { useState, useEffect, useCallback } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import userService from '../../services/userService';
import { groupService } from '../../services/groupService';
import { addMemberToProject, addMembersFromGroupToProject } from '../../services/projectService';
import '../../styles/pages/ManageProject/AddMemberModal.css';

const AddMemberModal = ({ isOpen, onClose, projectKey, onMemberAdded, existingMemberIds = [] }) => {
    const [addMode, setAddMode] = useState('individual');
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedRole, setSelectedRole] = useState('MEMBER');
    const [allGroups, setAllGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [selectedLeader, setSelectedLeader] = useState(null);
    const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState(new Set());
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

    useEffect(() => {
        if (selectedGroup) {
            const group = allGroups.find(g => g._id === selectedGroup.value);
            if (group && group.members) {
                const membersOfGroup = allUsers.filter(u => group.members.includes(u._id) && !existingMemberIds.includes(u._id));
                setTeamMembers(membersOfGroup);
                setSelectedTeamMemberIds(new Set(membersOfGroup.map(m => m._id)));
            }
            setSelectedLeader(null);
        } else {
            setTeamMembers([]);
            setSelectedTeamMemberIds(new Set());
        }
    }, [selectedGroup, allGroups, allUsers, existingMemberIds]);

    const handleTeamMemberToggle = (memberId) => {
        const newSelection = new Set(selectedTeamMemberIds);
        if (newSelection.has(memberId)) {
            newSelection.delete(memberId);
        } else {
            newSelection.add(memberId);
        }
        setSelectedTeamMemberIds(newSelection);
    };

    // [SỬA LẠI] - Hàm handleSubmit cho đúng với logic mới
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
                    toast.warn("Please select a team and a leader for the team.");
                    setIsSaving(false);
                    return;
                }
                if (selectedTeamMemberIds.size === 0) {
                    toast.warn("Please select at least one member to add from the team.");
                    setIsSaving(false);
                    return;
                }
                await addMembersFromGroupToProject(projectKey, {
                    groupId: selectedGroup.value,
                    leaderId: selectedLeader.value,
                    memberIds: Array.from(selectedTeamMemberIds),
                });
                toast.success("Team members added successfully!");
            }
            onMemberAdded();
            handleClose();
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
        onClose();
    };

    if (!isOpen) return null;

    const userOptions = allUsers
        .filter(u => !existingMemberIds.includes(u._id))
        .map(u => ({ value: u._id, label: u.fullname || u.username }));
    const groupOptions = allGroups.map(g => ({ value: g._id, label: g.name }));
    const leaderOptions = teamMembers
        .filter(m => selectedTeamMemberIds.has(m._id))
        .map(u => ({ value: u._id, label: u.fullname || u.username }));

    return (
        <div className="modal-overlay">
            <div className="modal-content add-member-modal">
                <h2>Add people to project</h2>
                <div className="add-mode-toggle">
                    <button className={`toggle-button ${addMode === 'individual' ? 'active' : ''}`} onClick={() => setAddMode('individual')}>Add Individual</button>
                    <button className={`toggle-button ${addMode === 'team' ? 'active' : ''}`} onClick={() => setAddMode('team')}>Add Team</button>
                </div>

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

                    {/* [SỬA LẠI] - Bọc lại toàn bộ bằng thẻ Fragment <> */}
                    {addMode === 'team' && (
                        <>
                            {/* Thêm lại dropdown chọn team */}
                            <div className="form-group">
                                <label>Select a Team</label>
                                <Select options={groupOptions} value={selectedGroup} onChange={setSelectedGroup} isLoading={isLoadingData} />
                            </div>

                            {selectedGroup && teamMembers.length > 0 && (
                                <div className="form-group member-selection-list">
                                    <label>Select members to add</label>
                                    <div className="checkbox-list-container">
                                    {teamMembers.map(member => (
                                        <div key={member._id} className="checkbox-item">
                                            <input
                                                type="checkbox"
                                                id={`member-${member._id}`}
                                                checked={selectedTeamMemberIds.has(member._id)}
                                                onChange={() => handleTeamMemberToggle(member._id)}
                                            />
                                               <label htmlFor={`member-${member._id}`}>
                                                <img src={member.avatar || '/default-avatar.png'} alt={member.fullname} className="item-avatar" />
                                                <span>{member.fullname || member.username}</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                            {selectedGroup && (
                                <div className="form-group">
                                    <label>Select a Leader (from selected members)</label>
                                    <Select options={leaderOptions} value={selectedLeader} onChange={setSelectedLeader} isDisabled={leaderOptions.length === 0} />
                                </div>
                            )}
                        </>
                    )}
                </div>

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