import FormCard from "../components/common/FormCard";
import LoginForm from "../components/form/LoginForm";
import authService from "../services/AuthService.js";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";

const Login = () => {
  const { login } = useAuth();

  const handleLogin = (formData) => {
    authService
      .login(formData)
      .then((response) => {
        login(response.user, response.token);
        toast.success("Login successful");
      })
      .catch((error) => {
        console.error("Login failed:", error);
        toast.error("Login failed");
      });
  };

  return (
    <FormCard title={"Login"}>
      <LoginForm onSubmit={handleLogin} />
    </FormCard>
  );
};

export default Login;
