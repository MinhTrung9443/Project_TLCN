// src/routes/AdminRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminRoute = ({ children }) => {
  const { user } = useAuth();

  // Nếu user tồn tại VÀ có system_role là 'admin' thì cho phép truy cập
  if (user && user.system_role === 'admin') {
    return children;
  }

  // Nếu không, chuyển hướng về trang chủ
  return <Navigate to="/" replace />;
};

export default AdminRoute;