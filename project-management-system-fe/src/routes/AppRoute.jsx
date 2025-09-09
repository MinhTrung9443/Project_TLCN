import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./../pages/Login.jsx";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const AppRouter = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

export default AppRouter;
