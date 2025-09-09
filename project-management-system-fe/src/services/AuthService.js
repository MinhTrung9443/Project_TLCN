import apiClient from "./apiClient";

const authService = {
  login: async (formData) => {
    try {
      const response = await apiClient.post("/login", {
        username: formData.username,
        password: formData.password,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default authService;
