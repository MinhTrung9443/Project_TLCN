import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./../pages/Login.jsx";
import LandingPage from "./../pages/LandingPage.jsx"; // <-- 1. Import trang mới

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} /> 

      <Route path="/login" element={<LoginPage />} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};
export default AppRoutes;