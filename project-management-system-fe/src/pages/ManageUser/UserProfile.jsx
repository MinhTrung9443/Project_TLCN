import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import userService from "../../services/userService";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

const UserProfilePage = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const { userId } = useParams();

  const [user, setUser] = useState(null);
  const [updateUser, setUpdateUser] = useState({});
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const fetched = await userService.getUserById(userId);
        setUser(fetched);
        setUpdateUser(fetched);
        setInitialData(fetched);
      } catch (error) {
        toast.error("Failed to load user");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  const onInputChange = (e) => {
    const { name, value } = e.target;
    setUpdateUser((prev) => ({ ...prev, [name]: value }));
  };

  const hasChanges = useMemo(() => {
    if (!initialData) return false;
    return JSON.stringify(updateUser) !== JSON.stringify(initialData);
  }, [initialData, updateUser]);

  const handleCancel = () => {
    if (initialData) {
      setUpdateUser(initialData);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await userService.updateUserInfo(userId, updateUser);
      toast.success("User updated successfully!");
      setInitialData(updateUser);
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to update user";
      toast.error(message);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading user..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <PageHeader
        title={updateUser.fullname || "User details"}
        subtitle="View and manage user information"
        icon="person"
        badge="User profile"
        actions={
          isAdmin ? (
            <Badge
              variant={updateUser.status === "active" ? "success" : "neutral"}
              size="md"
              icon={updateUser.status === "active" ? "check" : "pause"}
            >
              {updateUser.status === "active" ? "Active" : "Inactive"}
            </Badge>
          ) : null
        }
      />

      <form onSubmit={handleUpdateUser} className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 text-neutral-900 font-semibold text-lg mb-4">
            <span className="material-symbols-outlined">badge</span>
            Personal information
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="fullname"
              label="Full name"
              value={updateUser.fullname || ""}
              onChange={onInputChange}
              placeholder="Enter full name"
              icon="person"
            />
            <Input name="username" label="Username" value={updateUser.username || ""} disabled icon="badge" />
            <Input name="email" label="Email" type="email" value={updateUser.email || ""} disabled icon="mail" />
            <Input name="phone" label="Phone" value={updateUser.phone || ""} onChange={onInputChange} placeholder="Enter phone number" icon="call" />

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Gender</label>
              <select
                name="gender"
                value={updateUser.gender || "male"}
                onChange={onInputChange}
                disabled={!isAdmin}
                className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <Input
              name="role"
              label="Role"
              value={updateUser.role === "admin" ? "Admin" : "User"}
              disabled
              icon={updateUser.role === "admin" ? "shield" : "person"}
            />

            <Input
              name="group"
              label="Groups"
              value={Array.isArray(updateUser.group) ? updateUser.group.join(", ") : updateUser.group || ""}
              disabled
              icon="groups"
            />

            <Input
              name="lastLogin"
              label="Last login"
              value={updateUser.lastLogin ? new Date(updateUser.lastLogin).toLocaleString() : "Never"}
              disabled
              icon="schedule"
            />
          </div>

          {isAdmin && (
            <div className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-4">
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <span className="material-symbols-outlined">toggle_on</span>
                Account status
                <Badge
                  variant={updateUser.status === "active" ? "success" : "neutral"}
                  size="sm"
                  icon={updateUser.status === "active" ? "check" : "pause"}
                >
                  {updateUser.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </div>
              <label className="inline-flex items-center gap-2">
                <span className="text-sm text-neutral-700">Set active</span>
                <input
                  type="checkbox"
                  checked={updateUser.status === "active"}
                  onChange={() =>
                    setUpdateUser((prev) => ({
                      ...prev,
                      status: prev.status === "active" ? "inactive" : "active",
                    }))
                  }
                  className="w-5 h-5 accent-primary-600"
                />
              </label>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" icon="close" onClick={handleCancel} disabled={!isAdmin || !hasChanges}>
              Cancel
            </Button>
            {isAdmin && (
              <Button type="submit" icon="save" disabled={!hasChanges}>
                Save changes
              </Button>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-1" padding={false}>
          <div className="p-6 flex flex-col items-center gap-4">
            <div className="relative">
              {updateUser.avatar ? (
                <img src={updateUser.avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-3xl font-semibold">
                  {updateUser.fullname ? updateUser.fullname.charAt(0).toUpperCase() : "U"}
                </div>
              )}
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-neutral-900">{updateUser.fullname}</h3>
              <p className="text-sm text-neutral-500">{updateUser.email}</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Badge variant={updateUser.role === "admin" ? "primary" : "neutral"} size="md" icon={updateUser.role === "admin" ? "shield" : "person"}>
                {updateUser.role === "admin" ? "Administrator" : "User"}
              </Badge>
              <Badge
                variant={updateUser.status === "active" ? "success" : "neutral"}
                size="sm"
                icon={updateUser.status === "active" ? "check" : "pause"}
              >
                {updateUser.status}
              </Badge>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default UserProfilePage;
