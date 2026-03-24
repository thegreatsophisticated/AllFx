import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AuthInput, AuthHeader, MessageBanner, LoadingButton } from "@/components/auth/AuthComponents";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    if (!email || !newPassword) {
      setIsSuccess(false);
      setMessage("Please fill in all fields");
      return;
    }
    setIsLoading(true);
    setMessage("");

    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setMessage("Password reset successfully!");
    }, 1500);
  };

  return (
    <div className="app-shell min-h-screen bg-background">
      <AuthHeader onBack={() => navigate("/login")} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-4"
      >
        <h2 className="text-2xl font-display font-bold mb-1">Reset Password</h2>
        <p className="text-sm text-muted-foreground mb-8">
          Enter your email and new password
        </p>

        <div className="space-y-4">
          <AuthInput label="Email" value={email} onChange={setEmail} placeholder="your@email.com" />
          <AuthInput label="New Password" value={newPassword} onChange={setNewPassword} type="password" placeholder="Min. 6 characters" />

          {message && <MessageBanner message={message} isSuccess={isSuccess} />}

          <div className="pt-2">
            <LoadingButton loading={isLoading} onClick={handleReset}>
              Reset Password
            </LoadingButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
