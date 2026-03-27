import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { AuthInput, AuthHeader, MessageBanner, LoadingButton } from "@/components/auth/AuthComponents";
import { resetPassword } from "@/lib/api-auth";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    if (!email || !password || !confirmPassword) {
      setMessage("Please fill in all fields");
      setIsSuccess(false);
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setIsSuccess(false);
      return;
    }
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters");
      setIsSuccess(false);
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      await resetPassword(email, password);
      setIsSuccess(true);
      setMessage("Password updated! Redirecting to login…");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error: unknown) {
      setIsSuccess(false);
      if (error instanceof Error) {
        setMessage(error.message);
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
      <AuthHeader onBack={() => navigate("/login")} title="Reset Password" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-4"
      >
        <h2 className="text-2xl font-display font-bold mb-1">Reset password</h2>
        <p className="text-sm text-muted-foreground mb-8">
          Enter your email and choose a new password.
        </p>

        <div className="space-y-4">
          <AuthInput
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="your@email.com"
          />
          <AuthInput
            label="New Password"
            value={password}
            onChange={setPassword}
            type="password"
            placeholder="••••••••"
          />
          <AuthInput
            label="Confirm Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            type="password"
            placeholder="••••••••"
          />

          {message && <MessageBanner message={message} isSuccess={isSuccess} />}

          <div className="pt-2 space-y-3">
            <LoadingButton loading={isLoading} onClick={handleReset}>
              Reset Password
            </LoadingButton>

            <button
              onClick={() => navigate("/login")}
              className="w-full text-sm text-muted-foreground hover:text-primary"
            >
              Back to login
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;