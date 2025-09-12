import apiClient from "./apiClient";

const userService = {
  updateProfile: async (formData) => {
    try {
      const response = await apiClient.put("/users/profile", formData);
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default userService;