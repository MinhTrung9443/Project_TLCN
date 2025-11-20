// src/routes/AdminRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminRoute = ({ children }) => {
  const { user } = useAuth();

  if (user && user.role === 'admin') {
    return children;
  }

  return <Navigate to="/" replace />;
};

export default AdminRoute;