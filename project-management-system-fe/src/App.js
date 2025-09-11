import "./App.css";
import { AuthProvider } from "./contexts/AuthContext";
import AppRouter from "./routes/AppRoute";
import { ToastContainer } from "react-toastify";
import Layout from "./components/layout/Layout";

function App() {
  return (
    <AuthProvider>
      <Layout>
        <AppRouter />
      </Layout>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </AuthProvider>
  );
}

export default App;
