import apiClient from "./apiClient";

const authService = {
  login: async (formData) => {
    try {
      const response = await apiClient.post("/login", {
        email: formData.email,
        password: formData.password,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },
  forgotPassword: async (formData) => {
    try {
      const response = await apiClient.post("/forgot-password", {
        email: formData.email,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },
  resetPassword: async (formData) => {
    try {
      const response = await apiClient.post("/reset-password", {
        token: formData.token,
        newPassword: formData.newPassword,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default authService;
