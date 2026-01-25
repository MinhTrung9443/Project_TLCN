import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
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
  const handleStatusToggle = (e) => {
    const newStatus = e.target.checked ? "active" : "inactive";
    setFormData((prevState) => ({
      ...prevState,
      status: newStatus,
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
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 text-sm font-medium">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-8 mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white bg-opacity-20 rounded-full px-4 py-2 mb-4">
            <span className="material-symbols-outlined">person</span>
            <span className="text-sm font-medium">Account Settings</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-4xl">account_circle</span>
            <h1 className="text-4xl font-bold">My Profile</h1>
          </div>
          <p className="text-purple-100">Manage your personal details and account settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="mb-6">
                <div className="relative w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-5xl font-bold overflow-hidden">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{user.fullname ? user.fullname.charAt(0).toUpperCase() : "U"}</span>
                  )}
                </div>
                {isUploading && (
                  <div className="absolute inset-0 rounded-full bg-black bg-opacity-40 flex items-center justify-center">
                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={handleFileChange} />

              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
                onClick={handleAvatarClick}
                disabled={isUploading}
              >
                <span className="material-symbols-outlined">cloud_upload</span>
                {isUploading ? "Uploading..." : "Upload Avatar"}
              </button>

              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-4">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-purple-600 mt-1">badge</span>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-gray-600 uppercase">Role</div>
                      <div className="text-sm font-semibold text-gray-900 mt-1">{user?.role || "Member"}</div>
                    </div>
                  </div>
                </div>
                <div className="border-b border-gray-200 pb-4">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-purple-600 mt-1">email</span>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-gray-600 uppercase">Email</div>
                      <div className="text-sm font-semibold text-gray-900 mt-1">{user?.email}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-purple-600 mt-1">verified</span>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-600 uppercase">Status</div>
                    <div className={`text-sm font-semibold mt-1 ${formData.status === "active" ? "text-green-600" : "text-gray-500"}`}>
                      {formData.status === "active" ? "Active" : "Inactive"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm p-8">
              <div className="mb-8 pb-6 border-b border-gray-200">
                <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900 mb-2">
                  <span className="material-symbols-outlined">info</span>
                  Basic Information
                </h3>
                <p className="text-gray-600 text-sm">Update your personal details and contact information</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label htmlFor="fullname" className="flex items-center gap-1 text-sm font-semibold text-gray-900 mb-2">
                    <span className="material-symbols-outlined text-base">person</span>
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="fullname"
                    name="fullname"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.fullname}
                    onChange={handleChange}
                    required
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="username" className="flex items-center gap-1 text-sm font-semibold text-gray-900 mb-2">
                    <span className="material-symbols-outlined text-base">alternate_email</span>
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    disabled
                  />
                </div>

                <div>
                  <label htmlFor="email" className="flex items-center gap-1 text-sm font-semibold text-gray-900 mb-2">
                    <span className="material-symbols-outlined text-base">mail</span>
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="flex items-center gap-1 text-sm font-semibold text-gray-900 mb-2">
                    <span className="material-symbols-outlined text-base">phone</span>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="flex items-center gap-1 text-sm font-semibold text-gray-900 mb-2">
                    <span className="material-symbols-outlined text-base">wc</span>
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end pt-6 border-t border-gray-200">
                <button
                  type="button"
                  className="flex items-center gap-2 px-6 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleCancel}
                  disabled={!hasChanges()}
                >
                  <span className="material-symbols-outlined">close</span>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!hasChanges()}
                >
                  <span className="material-symbols-outlined">save</span>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MyProfilePage;
