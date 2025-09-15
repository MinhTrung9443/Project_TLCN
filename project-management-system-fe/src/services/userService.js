import apiClient from "./apiClient";

const userService = {
  // Cập nhật profile của chính mình
  updateProfile: async (formData) => {
    try {
      const response = await apiClient.put("/users/profile", formData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Lấy tất cả user (có phân trang)
  getAllUsers: async (page, limit) => {
    try {
      const response = await apiClient.get("/users/get-all-users", {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Xóa user theo id
  deleteUser: async (id) => {
    try {
      const response = await apiClient.post(`/users/delete-user/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Cập nhật thông tin user bất kỳ (admin)
  updateUserInfo: async (id, updateData) => {
    try {
      const response = await apiClient.post(
        `/users/update-user/${id}`,
        updateData
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Lấy user theo id
  getUserById: async (id) => {
    try {
      const response = await apiClient.get(`/users/get-user/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default userService;
