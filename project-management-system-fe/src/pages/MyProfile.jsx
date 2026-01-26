import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import userService from "../services/userService";

const MyProfilePage = () => {
  const { user, login } = useAuth();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    fullname: "",
    username: "",
    email: "",
    phone: "",
    gender: "",
    avatar: "",
  });
  const [initialData, setInitialData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  useEffect(() => {
    if (user) {
      const userData = {
        fullname: user.fullname || "",
        username: user.username || "",
        email: user.email || "",
        phone: user.phone || "",
        gender: user.gender || "",
        avatar: user.avatar || "",
        status: user.status || "inactive",
      };
      setFormData(userData);
      setInitialData(userData);
      setLoading(false);
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    setIsUploading(true);
    try {
      const response = await userService.uploadFile(file);

      setFormData((prev) => ({
        ...prev,
        avatar: response.imageUrl,
      }));

      toast.success("Avatar uploaded! Remember to click 'Save' to apply changes.");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload avatar.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    toast.info("Updating profile...");

    try {
      const response = await userService.updateProfile(formData);

      const updatedUser = response.user || response.data?.user;

      const token = localStorage.getItem("token");
      login(updatedUser, token);

      toast.success("Profile updated successfully!");

      setInitialData(formData);
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error(error.response?.data?.message || "Failed to update profile.");
    }
  };
  const hasChanges = () => {
    if (!initialData) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  };

  const handleCancel = () => {
    if (initialData) {
      setFormData(initialData);
    }
    toast.warn("Changes have been canceled.");
  };

  if (loading) {
    return (
      <div className="min-h-[360px] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <PageHeader title="My Profile" subtitle="Manage your personal details and account preferences" icon="account_circle" badge="Account settings" />

      <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1" padding={false}>
            <div className="p-6 space-y-6">
              <div className="relative flex flex-col items-center">
                <div className="relative w-28 h-28 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-4xl font-semibold overflow-hidden">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{user.fullname ? user.fullname.charAt(0).toUpperCase() : "U"}</span>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-4 w-full"
                  icon="cloud_upload"
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : "Upload avatar"}
                </Button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">
                      <span className="material-symbols-outlined">badge</span>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-neutral-500">Role</p>
                      <p className="text-sm font-semibold text-neutral-900">{user?.role || "Member"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">
                    <span className="material-symbols-outlined">mail</span>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">Email</p>
                    <p className="text-sm font-semibold text-neutral-900 break-all">{user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">
                    <span className="material-symbols-outlined">verified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs uppercase tracking-wide text-neutral-500">Status</p>
                    <Badge
                      variant={formData.status === "active" ? "success" : "neutral"}
                      size="sm"
                      icon={formData.status === "active" ? "check" : "pause"}
                    >
                      {formData.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-3">
            <div className="flex flex-col gap-2 pb-4 border-b border-neutral-200 mb-6">
              <div className="flex items-center gap-2 text-neutral-900 font-semibold text-lg">
                <span className="material-symbols-outlined">info</span>
                Basic information
              </div>
              <p className="text-sm text-neutral-600">Update your personal details and contact information.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Full name"
                name="fullname"
                value={formData.fullname}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
                icon="person"
              />
              <Input label="Username" name="username" value={formData.username} onChange={handleChange} disabled icon="alternate_email" />
              <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} disabled icon="mail" />
              <Input
                label="Phone number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                icon="call"
              />

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-neutral-200">
              <Button type="button" variant="secondary" icon="close" onClick={handleCancel} disabled={!hasChanges()}>
                Cancel
              </Button>
              <Button type="submit" icon="save" disabled={!hasChanges()}>
                Save changes
              </Button>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default MyProfilePage;
