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
};

export default authService;
