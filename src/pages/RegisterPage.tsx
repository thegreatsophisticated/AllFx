import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { AuthInput, AuthHeader, MessageBanner, LoadingButton } from "@/components/auth/AuthComponents";
import { register } from "@/lib/api-auth";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): string | null => {
    if (!phone || !email || !password || !confirmPassword) return "All fields are required";
    if (!/^\d{9}$/.test(phone)) return "Enter a valid 9-digit phone number";
    if (!/^[^@]+@[^@]+\.[^@]+/.test(email)) return "Enter a valid email address";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (password !== confirmPassword) return "Passwords do not match";
    return null;
  };

  const handleRegister = async () => {
    const validationError = validate();
    if (validationError) {
      setIsSuccess(false);
      setMessage(validationError);
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      await register(phone, email, password);
      setIsSuccess(true);
      setMessage("Account created! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error: unknown) {
      setIsSuccess(false);
      if (error instanceof Error) {
        setMessage(error.message); // real server message e.g. "Email already exists"
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
      <AuthHeader onBack={() => navigate("/")} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-4"
      >
        <h2 className="text-2xl font-display font-bold mb-1">Create account</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your details to register a new account
        </p>

        <div className="space-y-4">
          <AuthInput
            label="Phone Number"
            value={phone}
            onChange={setPhone}
            prefix="+250"
            placeholder="7XXXXXXXX"
          />
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
            placeholder="Min. 6 characters"
          />
          <AuthInput
            label="Confirm Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            type="password"
            placeholder="Re-enter password"
          />

          {message && <MessageBanner message={message} isSuccess={isSuccess} />}

          <div className="pt-2">
            <LoadingButton loading={isLoading} onClick={handleRegister}>
              Register
            </LoadingButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;