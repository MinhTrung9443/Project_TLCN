import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import userService from "../../services/userService";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ConfirmationModal from "../../components/common/ConfirmationModal";

const ManageUserPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteUserData, setDeleteUserData] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const usersPerPage = 9;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await userService.getAllUsers();
        setUsers(response);
        setFilteredUsers(response);
      } catch (error) {
        toast.error("Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    let result = users;

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (u) => u.fullname?.toLowerCase().includes(lower) || u.email?.toLowerCase().includes(lower) || u.username?.toLowerCase().includes(lower),
      );
    }

    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }

    setFilteredUsers(result);
    setCurrentPage(1);
  }, [users, searchTerm, roleFilter]);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.status === "active").length,
      admins: users.filter((u) => u.role === "admin").length,
    }),
    [users],
  );

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newUser = Object.fromEntries(formData.entries());
    newUser.role = "user";

    if (newUser.password !== newUser.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      const res = await userService.createUser(newUser);
      setUsers((prev) => [...prev, res.user]);
      setIsCreateOpen(false);
      toast.success("User created successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create user");
    }
  };

  const handleDeleteUser = async () => {
    try {
      await userService.deleteUser(deleteUserData.userId);
      setUsers((prev) => prev.map((u) => (u._id === deleteUserData.userId ? { ...u, status: "inactive" } : u)));
      toast.success("User deactivated");
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to deactivate user";
      toast.error(message);
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const renderAvatar = (u) => {
    if (u.avatar) {
      return <img src={u.avatar} alt={u.fullname} className="w-12 h-12 rounded-full object-cover" />;
    }
    return (
      <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
        {u.fullname?.charAt(0)?.toUpperCase()}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading users..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <PageHeader
        title="Team Members"
        subtitle="Manage access, roles, and user details across your organization"
        icon="groups"
        badge="User management"
        actions={
          user.role === "admin" ? (
            <Button icon="person_add" onClick={() => setIsCreateOpen(true)}>
              Add member
            </Button>
          ) : null
        }
      />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card padding={false} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                <span className="material-symbols-outlined">group</span>
              </div>
              <div>
                <p className="text-xs uppercase text-neutral-500">Total users</p>
                <p className="text-xl font-semibold text-neutral-900">{stats.total}</p>
              </div>
            </div>
          </Card>
          <Card padding={false} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success-100 text-success-700 flex items-center justify-center">
                <span className="material-symbols-outlined">verified_user</span>
              </div>
              <div>
                <p className="text-xs uppercase text-neutral-500">Active</p>
                <p className="text-xl font-semibold text-neutral-900">{stats.active}</p>
              </div>
            </div>
          </Card>
          <Card padding={false} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <span className="material-symbols-outlined">admin_panel_settings</span>
              </div>
              <div>
                <p className="text-xs uppercase text-neutral-500">Admins</p>
                <p className="text-xl font-semibold text-neutral-900">{stats.admins}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-3 w-full md:w-auto">
              <Input
                placeholder="Search by name, email, username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon="search"
                className="min-w-[240px]"
              />
              <div className="w-48">
                <label className="sr-only">Role filter</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All roles</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>
              </div>
            </div>

            {user.role === "admin" && (
              <Button icon="person_add" onClick={() => setIsCreateOpen(true)}>
                Add member
              </Button>
            )}
          </div>

          {currentUsers.length === 0 ? (
            <EmptyState icon="search_off" title="No users found" description="Try adjusting your search or filters" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {currentUsers.map((u) => (
                <Card key={u._id} hoverable className="h-full">
                  <div className="flex items-start justify-between gap-3" onClick={() => navigate(`/app/Organization/User/${u._id}`)}>
                    <div className="flex items-center gap-3">
                      {renderAvatar(u)}
                      <div>
                        <p className="text-base font-semibold text-neutral-900">{u.fullname}</p>
                        <p className="text-sm text-neutral-500">@{u.username}</p>
                        <div className="flex items-center gap-2 mt-2 text-sm text-neutral-600">
                          <span className="material-symbols-outlined text-[18px]">email</span>
                          <span className="truncate">{u.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-neutral-600">
                          <span className="material-symbols-outlined text-[18px]">call</span>
                          <span>{u.phone || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <Badge variant={u.role === "admin" ? "primary" : "neutral"} size="sm" icon={u.role === "admin" ? "shield" : "person"}>
                        {u.role === "admin" ? "Admin" : "User"}
                      </Badge>
                      <Badge variant={u.status === "active" ? "success" : "neutral"} size="sm" icon={u.status === "active" ? "check" : "pause"}>
                        {u.status}
                      </Badge>
                    </div>
                  </div>

                  {u.group?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {u.group.slice(0, 3).map((g) => (
                        <Badge key={g._id} variant="neutral" size="sm">
                          {g.name}
                        </Badge>
                      ))}
                      {u.group.length > 3 && (
                        <Badge variant="neutral" size="sm">
                          +{u.group.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between text-sm text-neutral-500">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">schedule</span>
                      <span>Last login: {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never"}</span>
                    </div>
                    {user.role === "admin" && (
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" icon="open_in_new" onClick={() => navigate(`/app/Organization/User/${u._id}`)}>
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-accent-600 hover:bg-accent-50"
                          icon="block"
                          onClick={() => {
                            setDeleteUserData({ userId: u._id, userName: u.fullname });
                            setIsDeleteModalOpen(true);
                          }}
                        >
                          Deactivate
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                icon="chevron_left"
              >
                Previous
              </Button>
              <span className="text-sm font-medium text-neutral-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                icon="chevron_right"
                iconPosition="right"
              >
                Next
              </Button>
            </div>
          )}
        </Card>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setIsCreateOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-neutral-500">New member</p>
                <h2 className="text-lg font-semibold text-neutral-900">Create user</h2>
              </div>
              <Button variant="ghost" size="sm" icon="close" onClick={() => setIsCreateOpen(false)} />
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input name="fullname" label="Full name" placeholder="Enter full name" required icon="person" />
                <Input name="phone" label="Phone" placeholder="Enter phone number" icon="call" />
                <Input name="email" label="Email" type="email" placeholder="Enter email address" required icon="mail" />
                <Input name="username" label="Username" placeholder="Enter username" required icon="badge" />
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Gender</label>
                  <select
                    name="gender"
                    className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <Input name="password" label="Password" type="password" placeholder="Enter password" required icon="lock" />
                <Input name="confirmPassword" label="Confirm password" type="password" placeholder="Confirm password" required icon="lock" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-200">
                <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" icon="check">
                  Create user
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteUser}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${deleteUserData?.userName}?`}
      />
    </div>
  );
};

export default ManageUserPage;
