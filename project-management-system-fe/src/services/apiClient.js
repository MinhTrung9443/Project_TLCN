import axios from "axios";

const apiBaseUrl = process.env.REACT_APP_API_URL || "/api";

// Tạo instance axios với cấu hình mặc định
const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
});

// Request interceptor - tự động thêm token vào header nếu có
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Only set Content-Type for non-FormData requests
    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default apiClient;
