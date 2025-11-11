import React, { createContext, useState, useContext, useMemo, useCallback, useEffect } from "react";
import socketService from "../services/socketService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser && storedUser !== "undefined") {
        return JSON.parse(storedUser);
      }
      return null;
    } catch (error) {
      console.error("Lỗi khi đọc user từ localStorage:", error);
      localStorage.removeItem("user");
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem("token");
    return storedToken && storedToken !== "undefined" ? storedToken : null;
  });

  // Kết nối socket khi component mount nếu đã có token
  useEffect(() => {
    if (token) {
      socketService.connect(token);
    }

    return () => {
      // Cleanup khi unmount
      socketService.disconnect();
    };
  }, []);

  const login = useCallback((userData, userToken) => {
    localStorage.setItem("token", userToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);

    // Kết nối socket với token
    socketService.connect(userToken);
  }, []);

  const logout = useCallback(() => {
    // Ngắt kết nối socket trước khi logout
    socketService.disconnect();

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token,
      login,
      logout,
    }),
    [user, token, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
