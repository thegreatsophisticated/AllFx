import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { AuthInput, AuthHeader, MessageBanner, LoadingButton } from "@/components/auth/AuthComponents";
import { login } from "@/lib/api-auth";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setMessage("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const data = await login(email, password);

      // No token from this backend — store user info directly
      sessionStorage.setItem("user_id", String(data.user_id));
      sessionStorage.setItem("email", data.email);
      sessionStorage.setItem("company_id", String(data.company_id));

      navigate("/dashboard");
    } catch (error: unknown) {
      // Our api-auth throws a plain Error with the server's message
      if (error instanceof Error) {
        setMessage(error.message);
      // Unexpected network-level failure
      } else if (axios.isAxiosError(error)) {
        setMessage(error.response?.data?.message ?? "Network error. Please try again.");
      } else {
        setMessage("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-shell min-h-screen bg-background">
      <AuthHeader onBack={() => navigate("/")} title="Login" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-4"
      >
        <h2 className="text-2xl font-display font-bold mb-1">Sign in</h2>
        <p className="text-sm text-muted-foreground mb-8">
          Enter your credentials to access your account
        </p>

        <div className="space-y-4">
          <AuthInput
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="your@email.com"
          />
          <AuthInput
            label="Password"
            value={password}
            onChange={setPassword}
            type="password"
            placeholder="••••••••"
          />

          <button
            onClick={() => navigate("/reset-password")}
            className="text-sm text-primary hover:underline"
          >
            Forgot your password?
          </button>

          {message && <MessageBanner message={message} isSuccess={false} />}

          <div className="pt-2 space-y-3">
            <LoadingButton loading={isLoading} onClick={handleLogin}>
              Login
            </LoadingButton>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">OR</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <LoadingButton
              loading={false}
              onClick={() => navigate("/register")}
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10"
            >
              Create an account
            </LoadingButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;